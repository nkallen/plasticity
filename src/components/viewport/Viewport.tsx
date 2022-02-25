import { CompositeDisposable, Disposable } from "event-kit";
import signals from "signals";
import * as THREE from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from '../../editor/EditorSignals';
import { ConstructionPlaneMemento, EditorOriginator, MementoOriginator, ViewportMemento } from "../../editor/History";
import { PlaneDatabase } from "../../editor/PlaneDatabase";
import { ConstructionPlane, ConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { SolidSelection } from "../../selection/TypedSelection";
import * as selector from '../../selection/ViewportSelector';
import { ViewportSelector } from '../../selection/ViewportSelector';
import { Theme } from "../../startup/LoadTheme";
import { Helper, Helpers } from "../../util/Helpers";
import { RenderedSceneBuilder } from "../../visual_model/RenderedSceneBuilder";
import * as visual from '../../visual_model/VisualModel';
import { Pane } from '../pane/Pane';
import { GridHelper } from "./GridHelper";
import { OrbitControls } from "./OrbitControls";
import { OutlinePass } from "./OutlinePass";
import { CameraMode, ProxyCamera } from "./ProxyCamera";
import { ViewportControlMultiplexer } from "./ViewportControlMultiplexer";
import { ViewportGeometryNavigator } from "./ViewportGeometryNavigator";
import { Orientation, ViewportNavigatorGizmo, ViewportNavigatorPass } from "./ViewportNavigator";
import { ViewportPointControl } from "./ViewportPointControl";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export interface EditorLike extends selector.EditorLike {
    db: DatabaseLike,
    helpers: Helpers,
    viewports: Viewport[],
    signals: EditorSignals,
    originator: EditorOriginator,
    windowLoaded: boolean,
    highlighter: RenderedSceneBuilder,
    keymaps: AtomKeymap.KeymapManager,
    styles: Theme,
    planes: PlaneDatabase,
}

export class Viewport implements MementoOriginator<ViewportMemento> {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    readonly changed = new signals.Signal();
    readonly navigationEnded = new signals.Signal();

    readonly gridColor = new THREE.Color(this.editor.styles.colors.grid).convertSRGBToLinear();
    readonly backgroundColor = new THREE.Color(this.editor.styles.colors.viewport).convertSRGBToLinear();
    readonly selectionOutlineColor = new THREE.Color(this.editor.styles.colors.yellow[400]).convertSRGBToLinear();
    readonly hoverOutlineColor = new THREE.Color(this.editor.styles.colors.yellow[50]).convertSRGBToLinear();

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
    private navigator = new ViewportGeometryNavigator(this.editor, this.navigationControls);
    private grid = new GridHelper(300, 300, this.gridColor, this.gridColor);

    constructor(
        private readonly editor: EditorLike,
        readonly renderer: THREE.WebGLRenderer,
        readonly domElement: HTMLElement,
        readonly camera: ProxyCamera,
        constructionPlane: ConstructionPlaneSnap,
        readonly navigationControls: OrbitControls,
    ) {
        this._constructionPlane = constructionPlane;

        renderer.domElement.addEventListener('pointermove', e => {
            this.lastPointerEvent = e;
        });

        renderer.setPixelRatio(window.devicePixelRatio);
        const size = renderer.getSize(new THREE.Vector2());
        const depthTexture = new THREE.DepthTexture(size.width, size.height, THREE.FloatType);
        // @ts-expect-error('three.js @types are out of date')
        const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { type: THREE.FloatType, generateMipmaps: false, skipInvalidateFramebuffer: true, depthTexture });
        renderTarget.samples = 4;

        EffectComposer: {
            this.composer = new EffectComposer(renderer, renderTarget);
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
            outlinePassSelection.visibleEdgeColor.copy(this.selectionOutlineColor);
            outlinePassSelection.hiddenEdgeColor.copy(this.selectionOutlineColor);
            outlinePassSelection.downSampleRatio = 1;
            this.outlinePassSelection = outlinePassSelection;

            const outlinePassHover = new OutlinePass(new THREE.Vector2(this.domElement.offsetWidth, this.domElement.offsetHeight), this.camera);
            outlinePassHover.edgeStrength = 3;
            outlinePassHover.edgeThickness = 1;
            outlinePassHover.visibleEdgeColor.copy(this.hoverOutlineColor);
            outlinePassHover.hiddenEdgeColor.copy(this.hoverOutlineColor);
            outlinePassHover.downSampleRatio = 1;
            this.outlinePassHover = outlinePassHover;

            const navigatorGizmo = new ViewportNavigatorGizmo(this, 100);
            const navigatorPass = new ViewportNavigatorPass(navigatorGizmo, this.camera);
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
                'viewport:navigate:front': () => this.navigate(Orientation.negY),
                'viewport:navigate:right': () => this.navigate(Orientation.posX),
                'viewport:navigate:top': () => this.navigate(Orientation.posZ),
                'viewport:navigate:back': () => this.navigate(Orientation.posY),
                'viewport:navigate:left': () => this.navigate(Orientation.negX),
                'viewport:navigate:bottom': () => this.navigate(Orientation.negZ),
                'viewport:navigate:face': () => this.navigate(this.editor.selection.selected.faces.first ?? this.editor.selection.selected.regions.first),
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

        this.scene.background = this.backgroundColor;
        this.scene.autoUpdate = false;
        this.multiplexer.push(this.points, this.selector);
    }

    private started = false;
    start() {
        if (this.started) return;
        this.started = true;

        this.editor.signals.selectionChanged.add(this.outlineSelection);
        this.editor.signals.historyChanged.add(this.outlineSelection);
        this.editor.signals.factoryUpdated.add(this.outlineSelection);
        this.editor.signals.factoryCancelled.add(this.outlineSelection);
        this.editor.signals.factoryCommitted.add(this.outlineSelection);
        this.editor.signals.hoverDelta.add(this.outlineHover);

        this.editor.signals.selectionChanged.add(this.setNeedsRender);
        this.editor.signals.sceneGraphChanged.add(this.setNeedsRender);
        this.editor.signals.factoryUpdated.add(this.setNeedsRender);
        this.editor.signals.factoryCancelled.add(this.setNeedsRender);
        this.editor.signals.pointPickerChanged.add(this.setNeedsRender);
        this.editor.signals.gizmoChanged.add(this.setNeedsRender);
        this.editor.signals.quasimodeChanged.add(this.setNeedsRender);
        this.editor.signals.hoverDelta.add(this.setNeedsRender);
        this.editor.signals.historyChanged.add(this.setNeedsRender);
        this.editor.signals.commandEnded.add(this.setNeedsRender);
        this.editor.signals.moduleReloaded.add(this.setNeedsRender);
        this.editor.signals.typeEnabled.add(this.setNeedsRender);
        this.editor.signals.typeDisabled.add(this.setNeedsRender);
        this.editor.signals.visibleLayersChanged.add(this.setNeedsRender);

        this.navigationControls.addEventListener('change', this.setNeedsRender);
        this.navigationControls.addEventListener('start', this.navigationStart);

        this.multiplexer.addEventListener('start', this.controlStart);
        this.multiplexer.addEventListener('end', this.controlEnd);

        this.multiplexer.addEventLiseners();
        this.navigationControls.addEventListeners();

        this.renderer.setAnimationLoop(clock => this.animate(clock));

        this.disposable.add(new Disposable(() => {
            this.editor.signals.selectionChanged.remove(this.outlineSelection);
            this.editor.signals.historyChanged.remove(this.outlineSelection);
            this.editor.signals.hoverDelta.remove(this.outlineHover);
            this.editor.signals.factoryUpdated.remove(this.outlineSelection);
            this.editor.signals.factoryCancelled.remove(this.outlineSelection);
            this.editor.signals.factoryCommitted.remove(this.outlineSelection);

            this.editor.signals.selectionChanged.remove(this.setNeedsRender);
            this.editor.signals.sceneGraphChanged.remove(this.setNeedsRender);
            this.editor.signals.factoryUpdated.remove(this.setNeedsRender);
            this.editor.signals.factoryCancelled.remove(this.setNeedsRender);
            this.editor.signals.pointPickerChanged.remove(this.setNeedsRender);
            this.editor.signals.gizmoChanged.remove(this.setNeedsRender);
            this.editor.signals.hoverDelta.remove(this.setNeedsRender);
            this.editor.signals.historyChanged.remove(this.setNeedsRender);
            this.editor.signals.moduleReloaded.remove(this.setNeedsRender);

            this.navigationControls.removeEventListener('change', this.setNeedsRender);
            this.navigationControls.removeEventListener('start', this.navigationStart);
            this.multiplexer.removeEventListener('start', this.controlStart);
            this.multiplexer.removeEventListener('end', this.controlEnd);

            this.multiplexer.dispose();
            this.selector.dispose();
            this.points.dispose();

            this.renderer.setAnimationLoop(null);
            this.started = false;
        }));
    }

    private needsRender = true;
    private setNeedsRender() { this.needsRender = true }

    private lastFrameNumber = -1; // FIXME: move to editor so that when there are multiple viewports, we don't redo work
    render(frameNumber: number) {
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
                this.addOverlays(scene);

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

            camera.layers = this.editor.layers.visible as THREE.Layers;
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

    private addOverlays(scene: THREE.Scene) {
        if (!this.showOverlays) return;
        const { grid, constructionPlane, camera, editor: { helpers } } = this;

        grid.position.copy(constructionPlane.p);
        grid.quaternion.setFromUnitVectors(Z, constructionPlane.n);
        if (this.isOrthoMode || this.constructionPlane === PlaneDatabase.ScreenSpace) {
            grid.quaternion.copy(camera.quaternion);
        }

        const fog = camera.isOrthographicCamera
            ? new THREE.Fog(this.backgroundColor, 100, 1000)
            : new THREE.Fog(this.backgroundColor, 1, 100)
        scene.fog = fog;

        grid.update(camera);
        helpers.axes.updateMatrixWorld();
        scene.add(helpers.axes);
        scene.add(grid);
    }

    private readonly clock = new THREE.Clock();
    private animate(frameNumber: number) {
        const delta = this.clock.getDelta();
        if (this.navigator.update(delta)) this.setNeedsRender();
        this.render(frameNumber);
    }

    private outlineSelection() {
        this.outlinePassSelection.selectedObjects = this.collectOutline(this.editor.highlighter.outlineSelection);
    }

    private outlineHover() {
        this.outlinePassHover.selectedObjects = this.collectOutline(this.editor.highlighter.outlineHover);
    }

    private collectOutline(selection: SolidSelection) {
        const toOutline = [];
        for (const item of selection) {
            const outline = item.outline;
            if (outline !== undefined) toOutline.push(outline);
        }
        return toOutline;
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        const { camera, renderer, composer } = this;
        camera.setSize(offsetWidth, offsetHeight);

        renderer.setSize(offsetWidth, offsetHeight);
        composer.setSize(offsetWidth, offsetHeight);
        this.setNeedsRender();
    }

    private readonly controls = [this.multiplexer, this.selector, this.points, this.navigationControls];
    disableControls(except?: { enable(e: boolean): Disposable }): Disposable {
        const disposable = new CompositeDisposable();
        for (const control of this.controls) {
            if (control === except) continue;
            disposable.add(control.enable(false));
        }
        return disposable;
    }

    enableControls() {
        for (const control of this.controls) control.enable(true);
    }

    private navigationState: NavigationState = { tag: 'none' }

    private navigationStart() {
        switch (this.navigationState.tag) {
            case 'none':
                this.navigationControls.addEventListener('change', this.navigationChange);
                this.navigationControls.addEventListener('end', this.navigationEnd);
                const restoreControls = this.disableControls(this.navigationControls);
                this.navigationState = { tag: 'navigating', restoreControls, quaternion: this.camera.quaternion.clone() };
                this.editor.signals.viewportActivated.dispatch(this);
                break;
            default: throw new Error("invalid state");
        }
    }

    private navigationChange() {
        switch (this.navigationState.tag) {
            case 'navigating':
                this.transitionFromOrthoModeIfOrbitted(this.navigationState.quaternion);
                break;
            default: throw new Error("invalid state");
        }
    }

    // NOTE: ortho mode is not the same as an ortho camera; in ortho mode you have an ortho camera but there are also special snapping behaviors, etc.
    private orthoState?: { oldCameraMode: CameraMode } = undefined;
    get isOrthoMode(): boolean { return this.orthoState !== undefined }

    private transitionToOrthoMode() {
        if (this.orthoState !== undefined) return;
        const oldCameraMode = this.camera.setOrtho();
        this.orthoState = { oldCameraMode };
    }

    private transitionFromOrthoModeIfOrbitted(quaternion: THREE.Quaternion) {
        if (this.orthoState === undefined) return;
        const dot = quaternion.dot(this.camera.quaternion);
        if (Math.abs(dot - 1) > 10e-5) {
            this.transitionFromOrthoMode();
        }
    }

    private transitionFromOrthoMode() {
        if (this.orthoState === undefined) return;
        this.camera.setMode(this.orthoState.oldCameraMode);
        this.orthoState = undefined;
        this.constructionPlane = PlaneDatabase.XY;
        this.changed.dispatch();
    }

    private navigationEnd() {
        switch (this.navigationState.tag) {
            case 'navigating':
                this.navigationControls.removeEventListener('change', this.navigationChange);
                this.navigationControls.removeEventListener('end', this.navigationEnd);
                this.navigationState.restoreControls.dispose();
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

    private _constructionPlane!: ConstructionPlane;
    get constructionPlane() { return this._constructionPlane }
    set constructionPlane(plane: ConstructionPlane) {
        this._constructionPlane = plane;
        this.setNeedsRender();
        this.changed.dispatch();
    }

    togglePerspective() {
        this.camera.toggle();
        this.transitionFromOrthoMode();
        this.navigationControls.update();
        this.changed.dispatch();
        this.setNeedsRender();
    }

    get fov() { return this.camera.fov }
    set fov(fov: number) {
        this.camera.fov = fov;
        this.transitionFromOrthoMode();
        this.navigationControls.update();
        this.changed.dispatch();
        this.setNeedsRender();
    }

    get isXRay() { return this.editor.layers.isXRay }
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

    get isShowingEdges() { return this.editor.layers.isShowingEdges }
    set isShowingEdges(show: boolean) {
        this.editor.layers.isShowingEdges = show;
    }

    get isShowingFaces() { return this.editor.layers.isShowingFaces }
    set isShowingFaces(show: boolean) {
        this.editor.layers.isShowingFaces = show;
    }

    private _isRenderMode = false;
    get isRenderMode() { return this._isRenderMode }
    set isRenderMode(isRenderMode: boolean) {
        this._isRenderMode = true;
        this.changed.dispatch();
    }

    private _shouldShowOverlays = true;
    get showOverlays() { return this._shouldShowOverlays }
    toggleOverlays() {
        this._shouldShowOverlays = !this._shouldShowOverlays;
        this.setNeedsRender();
        this.changed.dispatch();
    }

    navigate(to?: Orientation | visual.Face | visual.PlaneInstance<visual.Region>) {
        if (to === undefined) return;
        const constructionPlane = this.navigator.navigate(to);
        this.constructionPlane = constructionPlane;
        this.transitionToOrthoMode();
        this.changed.dispatch();
    }

    focus() {
        const { solids, curves, regions, controlPoints } = this.editor.selection.selected;
        this.navigationControls.focus([...solids, ...curves, ...regions, ...controlPoints], this.editor.db.visibleObjects);
    }

    validate() {
        console.assert(this.selector.enabled, "this.selector.enabled");
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
        this.navigationControls.update();
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

type NavigationState = { tag: 'none' } | { tag: 'navigating', restoreControls: Disposable, quaternion: THREE.Quaternion }

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
            let constructionPlane: ConstructionPlaneSnap;
            let enableRotate = false;
            switch (view) {
                case "3d":
                    camera = new ProxyCamera();
                    camera.position.set(5, -5, 5);
                    constructionPlane = PlaneDatabase.XY;
                    enableRotate = true;
                    break;
                case "top":
                    camera = new ProxyCamera();
                    camera.position.set(0, 0, 10);
                    constructionPlane = PlaneDatabase.XY;
                    break;
                case "right":
                    camera = new ProxyCamera();
                    camera.position.set(10, 0, 0);
                    constructionPlane = PlaneDatabase.YZ;
                    break;
                case "front":
                default:
                    camera = new ProxyCamera();
                    camera.position.set(0, 10, 0);
                    constructionPlane = PlaneDatabase.XZ;
                    break;
            }

            const navigationControls = new OrbitControls(camera, renderer.domElement, editor.keymaps);
            navigationControls.enableRotate = enableRotate;

            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            camera.updateMatrixWorld();

            this.model = new Viewport(
                editor,
                renderer,
                this,
                camera,
                constructionPlane,
                navigationControls,
            );
        }

        connectedCallback() {
            editor.viewports.push(this.model);

            const pane = this.parentElement as Pane | null;
            pane?.signals?.flexScaleChanged.add(this.resize);
            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);

            if (editor.windowLoaded) this.model.start();
        }

        disconnectedCallback() { this.model.dispose() }

        private debounce?: NodeJS.Timeout;
        resize = () => {
            if (this.debounce !== undefined) clearTimeout(this.debounce);

            this.debounce = setTimeout(() => {
                this.model.setSize(this.offsetWidth, this.offsetHeight);
                this.model.start();
            }, 30);
        }
    }

    customElements.define('plasticity-viewport', ViewportElement);
}