import { CompositeDisposable, Disposable } from "event-kit";
import signals from "signals";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { EditorSignals } from '../../editor/EditorSignals';
import { DatabaseLike } from "../../editor/GeometryDatabase";
import { ConstructionPlaneMemento, EditorOriginator, MementoOriginator, ViewportMemento } from "../../editor/History";
import { VisibleLayers } from "../../editor/LayerManager";
import { ConstructionPlaneSnap, PlaneSnap } from "../../editor/snaps/Snap";
import * as selector from '../../selection/ViewportSelector';
import { ViewportSelector } from '../../selection/ViewportSelector';
import { Helper, Helpers } from "../../util/Helpers";
import { xray } from "../../visual_model/Intersectable";
import { RenderedSceneBuilder } from "../../visual_model/RenderedSceneBuilder";
import { Pane } from '../pane/Pane';
import { GridHelper } from "./GridHelper";
import { OrbitControls } from "./OrbitControls";
import { OutlinePass } from "./OutlinePass";
import { ProxyCamera } from "./ProxyCamera";
import { ViewportControlMultiplexer } from "./ViewportControlMultiplexer";
import { Orientation, ViewportNavigator, ViewportNavigatorPass } from "./ViewportHelper";
import { ViewportPointControl } from "./ViewportPointControl";

const gridColor = new THREE.Color(0x666666).convertGammaToLinear();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const backgroundColor = new THREE.Color(0x424242).convertGammaToLinear();

export interface EditorLike extends selector.EditorLike {
    db: DatabaseLike,
    helpers: Helpers,
    viewports: Viewport[],
    signals: EditorSignals,
    originator: EditorOriginator,
    windowLoaded: boolean,
    highlighter: RenderedSceneBuilder,
    keymaps: AtomKeymap.KeymapManager,
}

export class Viewport implements MementoOriginator<ViewportMemento> {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    readonly changed = new signals.Signal();
    readonly navigationEnded = new signals.Signal();
    
    readonly composer: EffectComposer;
    readonly outlinePassSelection: OutlinePass;
    readonly outlinePassHover: OutlinePass;
    readonly phantomsPass: RenderPass;
    readonly helpersPass: RenderPass;

    readonly points = new ViewportPointControl(this, this.editor);
    readonly selector = new ViewportSelector(this, this.editor);
    readonly multiplexer = new ViewportControlMultiplexer(this, this.editor.layers, this.editor.db, this.editor.signals);

    lastPointerEvent?: PointerEvent;

    private readonly scene = new THREE.Scene();
    private readonly phantomsScene = new THREE.Scene(); // Objects visualizing a geometry computation, like a transparent red boolean difference object.
    private readonly helpersScene = new THREE.Scene(); // Things like gizmos

    readonly additionalHelpers = new Set<THREE.Object3D>();
    private navigator = new ViewportNavigator(this.navigationControls, this.domElement, 128);
    private grid = new GridHelper(300, 300, gridColor, gridColor);

    constructor(
        private readonly editor: EditorLike,
        readonly renderer: THREE.WebGLRenderer,
        readonly domElement: HTMLElement,
        readonly camera: ProxyCamera,
        constructionPlane: PlaneSnap,
        readonly navigationControls: OrbitControls,
    ) {
        this.constructionPlane = constructionPlane;
        const rendererDomElement = this.renderer.domElement;

        rendererDomElement.addEventListener('pointermove', e => {
            this.lastPointerEvent = e;
        });

        this.renderer.setPixelRatio(window.devicePixelRatio);
        const size = this.renderer.getSize(new THREE.Vector2());
        const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { type: THREE.FloatType, generateMipmaps: false });
        renderTarget.samples = 4;

        EffectComposer: {
            this.composer = new EffectComposer(this.renderer, renderTarget);
            this.composer.setPixelRatio(window.devicePixelRatio);

            const renderPass = new RenderPass(this.scene, this.camera);
            this.phantomsPass = new RenderPass(this.phantomsScene, this.camera);
            this.helpersPass = new RenderPass(this.helpersScene, this.camera);

            this.phantomsPass.clear = false;
            this.phantomsPass.clearDepth = true;
            this.helpersPass.clear = false;
            this.helpersPass.clearDepth = true;

            const outlinePassSelection = new OutlinePass(new THREE.Vector2(this.domElement.offsetWidth, this.domElement.offsetHeight), this.camera);
            outlinePassSelection.edgeStrength = 3;
            outlinePassSelection.edgeThickness = 1;
            outlinePassSelection.visibleEdgeColor.setHex(0xfffff00);
            outlinePassSelection.hiddenEdgeColor.setHex(0xfffff00);
            outlinePassSelection.downSampleRatio = 1;
            this.outlinePassSelection = outlinePassSelection;

            const outlinePassHover = new OutlinePass(new THREE.Vector2(this.domElement.offsetWidth, this.domElement.offsetHeight), this.camera);
            outlinePassHover.edgeStrength = 3;
            outlinePassHover.edgeThickness = 1;
            outlinePassHover.visibleEdgeColor.setHex(0xfffffff);
            outlinePassHover.hiddenEdgeColor.setHex(0xfffffff);
            outlinePassHover.downSampleRatio = 1;
            this.outlinePassHover = outlinePassHover;

            const navigatorPass = new ViewportNavigatorPass(this.navigator, this.camera);
            const gammaCorrection = new ShaderPass(GammaCorrectionShader);

            this.composer.addPass(renderPass);
            this.composer.addPass(this.outlinePassHover);
            this.composer.addPass(this.outlinePassSelection);
            this.composer.addPass(this.phantomsPass);
            this.composer.addPass(this.helpersPass);
            this.composer.addPass(navigatorPass);
            this.composer.addPass(gammaCorrection);
        }

        this.render = this.render.bind(this);
        this.setNeedsRender = this.setNeedsRender.bind(this);
        this.outlineSelection = this.outlineSelection.bind(this);
        this.outlineHover = this.outlineHover.bind(this);
        this.navigationStart = this.navigationStart.bind(this);
        this.navigationEnd = this.navigationEnd.bind(this);
        this.navigationChange = this.navigationChange.bind(this);
        this.controlStart = this.controlStart.bind(this);
        this.controlEnd = this.controlEnd.bind(this);

        this.disposable.add(
            this.editor.registry.add(this.domElement, {
                'viewport:front': () => this.navigate(Orientation.negY),
                'viewport:right': () => this.navigate(Orientation.posX),
                'viewport:top': () => this.navigate(Orientation.posZ),
                'viewport:back': () => this.navigate(Orientation.posY),
                'viewport:left': () => this.navigate(Orientation.negX),
                'viewport:bottom': () => this.navigate(Orientation.negZ),
                'viewport:focus': () => this.focus(),
                'viewport:toggle-orthographic': () => this.togglePerspective(),
                'viewport:toggle-x-ray': () => this.toggleXRay(),
                'viewport:toggle-overlays': () => this.toggleOverlays(),
            })
        );

        this.disposable.add(new Disposable(() => {
            this.selector.dispose();
            this.points.dispose();
            this.navigationControls.dispose();
        }));

        this.scene.background = backgroundColor;
        this.scene.autoUpdate = false;
    }

    private started = false;
    start() {
        if (this.started) return;

        this.editor.signals.selectionChanged.add(this.outlineSelection);
        this.editor.signals.historyChanged.add(this.outlineSelection);
        this.editor.signals.factoryUpdated.add(this.outlineSelection);
        this.editor.signals.factoryCancelled.add(this.outlineSelection);
        this.editor.signals.factoryCommitted.add(this.outlineSelection);
        this.editor.signals.hoverChanged.add(this.outlineHover);

        this.editor.signals.selectionChanged.add(this.setNeedsRender);
        this.editor.signals.sceneGraphChanged.add(this.setNeedsRender);
        this.editor.signals.factoryUpdated.add(this.setNeedsRender);
        this.editor.signals.factoryCancelled.add(this.setNeedsRender);
        this.editor.signals.pointPickerChanged.add(this.setNeedsRender);
        this.editor.signals.gizmoChanged.add(this.setNeedsRender);
        this.editor.signals.hoverChanged.add(this.setNeedsRender);
        this.editor.signals.historyChanged.add(this.setNeedsRender);
        this.editor.signals.commandEnded.add(this.setNeedsRender);
        this.editor.signals.moduleReloaded.add(this.setNeedsRender);

        this.navigationControls.addEventListener('change', this.setNeedsRender);
        this.navigationControls.addEventListener('start', this.navigationStart);

        this.multiplexer.push(this.points, this.selector);
        this.multiplexer.addEventListener('start', this.controlStart);
        this.multiplexer.addEventListener('end', this.controlEnd);
        this.multiplexer.addEventLiseners();

        this.started = true;
        this.render(-1);

        this.disposable.add(new Disposable(() => {
            this.editor.signals.selectionChanged.remove(this.outlineSelection);
            this.editor.signals.historyChanged.remove(this.outlineSelection);
            this.editor.signals.hoverChanged.remove(this.outlineHover);
            this.editor.signals.factoryUpdated.remove(this.outlineSelection);
            this.editor.signals.factoryCancelled.remove(this.outlineSelection);
            this.editor.signals.factoryCommitted.remove(this.outlineSelection);

            this.editor.signals.selectionChanged.remove(this.setNeedsRender);
            this.editor.signals.sceneGraphChanged.remove(this.setNeedsRender);
            this.editor.signals.factoryUpdated.remove(this.setNeedsRender);
            this.editor.signals.factoryCancelled.remove(this.setNeedsRender);
            this.editor.signals.pointPickerChanged.remove(this.setNeedsRender);
            this.editor.signals.gizmoChanged.remove(this.setNeedsRender);
            this.editor.signals.hoverChanged.remove(this.setNeedsRender);
            this.editor.signals.historyChanged.remove(this.setNeedsRender);
            this.editor.signals.moduleReloaded.remove(this.setNeedsRender);

            this.navigationControls.removeEventListener('change', this.setNeedsRender);
            this.navigationControls.removeEventListener('start', this.navigationStart);
            this.multiplexer.removeEventListener('start', this.controlStart);
            this.multiplexer.removeEventListener('end', this.controlEnd);

            this.multiplexer.dispose();
            this.selector.dispose();
            this.points.dispose();

            this.started = false;
        }));
    }

    private needsRender = true;
    private setNeedsRender() { this.needsRender = true }

    private lastFrameNumber = -1; // FIXME: move to editor so that when there are multiple viewports, we don't redo work
    render(frameNumber: number) {
        if (!this.started) return;
        requestAnimationFrame(this.render);

        if (!this.needsRender) return;
        this.needsRender = false;

        const { editor: { db, helpers, signals }, scene, phantomsScene, helpersScene, composer, camera, lastFrameNumber, phantomsPass, helpersPass, grid, constructionPlane, domElement } = this
        const additional = [...this.additionalHelpers];

        try {
            // prepare the scene, once per frame (there may be multiple viewports rendering the same frame):
            if (frameNumber > lastFrameNumber) {
                const visibleObjects = db.visibleObjects;
                if (visibleObjects.length > 0) scene.add(...visibleObjects);
                scene.add(db.temporaryObjects);
                if (this.showOverlays) {
                    grid.position.set(0, 0, -0.001);
                    grid.quaternion.setFromUnitVectors(Y, constructionPlane.n);
                    grid.update(camera);
                    grid.updateMatrixWorld();
                    helpers.axes.updateMatrixWorld();
                    scene.add(helpers.axes);
                    scene.add(grid);
                }

                helpersScene.add(helpers.scene);
                phantomsScene.add(db.phantomObjects);

                if (additional.length > 0) {
                    if (this.isXRay) helpersScene.add(...additional);
                    else this.scene.add(...additional)
                }

                phantomsPass.enabled = db.phantomObjects.children.length > 0;
                helpersPass.enabled = helpers.scene.children.length > 0;
            }

            const resolution = new THREE.Vector2(domElement.offsetWidth, domElement.offsetHeight);
            signals.renderPrepared.dispatch({ camera, resolution });
            helpersScene.traverse(child => { if (child instanceof Helper) child.update(camera) });
            // FIXME: this is inefficient
            scene.traverse(child => { if (child instanceof Helper) child.update(camera) });

            camera.layers = VisibleLayers;
            composer.render();

            if (frameNumber > lastFrameNumber) {
                scene.clear();
                helpersScene.clear();
                phantomsScene.clear();
            }
        } finally {
            this.lastFrameNumber = frameNumber;
        }
    }

    outlineSelection() {
        const selection = this.editor.highlighter.outlineSelection;
        const toOutline = [...selection].flatMap(item => item.outline);
        this.outlinePassSelection.selectedObjects = toOutline;
    }

    outlineHover() {
        const hover = this.editor.highlighter.outlineHover;
        const toOutline = [...hover].flatMap(item => item.outline);
        this.outlinePassHover.selectedObjects = toOutline;
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        const { camera, renderer, composer, outlinePassHover, outlinePassSelection } = this;
        camera.setSize(offsetWidth, offsetHeight);

        renderer.setSize(offsetWidth, offsetHeight);
        composer.setSize(offsetWidth, offsetHeight);
        this.setNeedsRender();
    }

    private readonly controls = [this.multiplexer, this.selector, this.points, this.navigationControls];
    disableControls(except?: { set enabled(e: boolean) }) {
        for (const control of this.controls) {
            if (control === except) continue;
            control.enabled = false;
        }
    }

    enableControls() {
        this.multiplexer.enabled = this.selector.enabled = this.navigationControls.enabled = this.points.enabled = true;
    }

    private navigationState: NavigationState = { tag: 'none' }

    private navigationStart() {
        switch (this.navigationState.tag) {
            case 'none':
                this.navigationControls.addEventListener('change', this.navigationChange);
                this.navigationControls.addEventListener('end', this.navigationEnd);
                this.navigationState = { tag: 'navigating', multiplexerEnabled: this.multiplexer.enabled, quaternion: this.camera.quaternion.clone() };
                this.disableControls(this.navigationControls);
                this.editor.signals.viewportActivated.dispatch(this);
                break;
            default: throw new Error("invalid state");
        }
    }

    private navigationChange() {
        switch (this.navigationState.tag) {
            case 'navigating':
                const dot = this.navigationState.quaternion.dot(this.camera.quaternion);
                if (Math.abs(dot - 1) > 10e-3) {
                    if (this._isOrtho) {
                        this._isOrtho = false;
                        this.constructionPlane = new ConstructionPlaneSnap(Z);
                        this.changed.dispatch();
                    }
                }
                this.constructionPlane.update(this.camera);
                break;
            default: throw new Error("invalid state");
        }
    }

    private navigationEnd() {
        switch (this.navigationState.tag) {
            case 'navigating':
                this.navigationControls.removeEventListener('change', this.navigationChange);
                this.navigationControls.removeEventListener('end', this.navigationEnd);
                this.multiplexer.enabled = this.navigationState.multiplexerEnabled;
                this.navigationEnded.dispatch();
                this.navigationState = { tag: 'none' };
                break;
            default: throw new Error("invalid state");
        }
    }

    private controlStart() {
        this.editor.signals.viewportActivated.dispatch(this);
    }

    private controlEnd() { }

    private _constructionPlane!: PlaneSnap;
    get constructionPlane() { return this._constructionPlane }
    set constructionPlane(plane: PlaneSnap) {
        this._constructionPlane = plane;
        this.setNeedsRender();
    }

    togglePerspective() {
        this.camera.toggle();
        this.navigationControls.update();
        this.setNeedsRender();
        this.changed.dispatch();
    }

    // FIXME: xray should be a viewport-only property
    get isXRay() { return VisibleLayers.test(xray) }
    set isXRay(isXRay: boolean) {
        this.editor.layers.setXRay(isXRay);
        this.setNeedsRender();
        this.changed.dispatch();
    }

    toggleXRay() {
        this.editor.layers.toggleXRay();
        this.setNeedsRender();
        this.changed.dispatch();
    }

    private _showOverlays = true;
    get showOverlays() { return this._showOverlays }
    toggleOverlays() {
        this._showOverlays = !this._showOverlays;
        this.setNeedsRender();
        this.changed.dispatch();
    }

    navigate(to: Orientation) {
        const n = this.navigator.prepareAnimationData(to);
        const constructionPlane = new ConstructionPlaneSnap(n);
        this.constructionPlane = constructionPlane;
        this._isOrtho = true;
        this.changed.dispatch();
    }

    focus() {
        const { solids, curves, regions, controlPoints } = this.editor.selection.selected;
        this.navigationControls.focus([...solids, ...curves, ...regions, ...controlPoints], this.editor.db.visibleObjects);
    }

    private _isOrtho = false;
    get isOrtho() { return this._isOrtho }

    validate() {
        console.assert(this.selector.enabled, "this.selector.enabled");
        this.selector.enabled = true;
    }

    saveToMemento(): ViewportMemento {
        return new ViewportMemento(
            this.camera.saveToMemento(),
            this.navigationControls.target,
            this.isXRay,
            new ConstructionPlaneMemento(this.constructionPlane.n, this.constructionPlane.n));
    }

    restoreFromMemento(m: ViewportMemento): void {
        this.camera.restoreFromMemento(m.camera);
        this.navigationControls.target.copy(m.target);
        this.isXRay = m.isXRay;
        this.changed.dispatch();
    }

    async serialize(): Promise<Buffer> {
        return this.saveToMemento().serialize();
    }

    async deserialize(data: Buffer): Promise<void> {
        this.restoreFromMemento(ViewportMemento.deserialize(data));
    }

    debug(): void { }

    // top left is 0,0, bottom right is width,height
    getMousePosition(event: MouseEvent, to = new THREE.Vector2()): THREE.Vector2 {
        const [x, y] = [event.clientX, event.clientY];
        const rect = this.domElement.getBoundingClientRect();
        to.set((x - rect.left), rect.height - (y - rect.top));
        return to;
    }

    // input: top left is 0,0, bottom right is width,height
    // output: bottom left -1,-1, top right 1,1
    normalizeScreenPosition(position: THREE.Vector2): THREE.Vector2 {
        const rect = this.domElement.getBoundingClientRect();
        position.set(position.x / rect.width, position.y / rect.height);
        position.set((position.x * 2) - 1, (position.y * 2) - 1);
        return position;
    }

    // input: bottom left -1,-1, top right 1,1
    // output: top left is 0,0, botton right is width,height
    denormalizeScreenPosition(position: THREE.Vector2): THREE.Vector2 {
        position.set((position.x + 1) / 2, (position.y + 1) / 2);
        const rect = this.domElement.getBoundingClientRect();
        position.set(position.x * rect.width, position.y * rect.height);
        return position;
    }

    getNormalizedMousePosition(event: MouseEvent, to = new THREE.Vector2()): THREE.Vector2 {
        const result = this.getMousePosition(event, to);
        this.normalizeScreenPosition(result);
        return result;
    }
}

type NavigationState = { tag: 'none' } | { tag: 'navigating', multiplexerEnabled: boolean, quaternion: THREE.Quaternion }

export interface ViewportElement {
    readonly model: Viewport;
}

export default (editor: EditorLike) => {
    class ViewportElement extends HTMLElement implements ViewportElement {
        readonly model: Viewport;

        constructor() {
            super();

            const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });

            this.append(renderer.domElement);

            const view = this.getAttribute("view");

            let camera: ProxyCamera;
            let n: THREE.Vector3;
            let enableRotate = false;
            switch (view) {
                case "3d":
                    camera = new ProxyCamera();
                    camera.position.set(5, -5, 5);
                    n = Z;
                    enableRotate = true;
                    break;
                case "top":
                    camera = new ProxyCamera();
                    camera.position.set(0, 0, 10);
                    n = Z;
                    break;
                case "right":
                    camera = new ProxyCamera();
                    camera.position.set(10, 0, 0);
                    n = X;
                    break;
                case "front":
                default:
                    camera = new ProxyCamera();
                    camera.position.set(0, 10, 0);
                    n = Y;
                    break;
            }

            const navigationControls = new OrbitControls(camera, renderer.domElement, editor.keymaps);
            navigationControls.enableRotate = enableRotate;

            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            camera.updateMatrixWorld();

            const constructionPlane = new ConstructionPlaneSnap(n);

            this.model = new Viewport(
                editor,
                renderer,
                this,
                camera,
                constructionPlane,
                navigationControls,
            );

            this.resize = this.resize.bind(this);
        }

        connectedCallback() {
            editor.viewports.push(this.model);

            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);

            if (editor.windowLoaded) this.model.start();
        }

        disconnectedCallback() {
            this.model.dispose();
        }

        resize() {
            this.model.start();
            this.model.setSize(this.offsetWidth, this.offsetHeight);
        }
    }

    customElements.define('ispace-viewport', ViewportElement);
}