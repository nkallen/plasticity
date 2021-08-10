import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { EditorSignals } from '../../editor/EditorSignals';
import { GeometryDatabase } from "../../editor/GeometryDatabase";
import { EditorOriginator } from "../../editor/History";
import { CameraPlaneSnap, ConstructionPlaneSnap, PlaneSnap } from "../../editor/SnapManager";
import * as visual from "../../editor/VisualModel";
import { ControlPoint, Region, Solid, SpaceItem, TopologyItem } from "../../editor/VisualModel";
import { SelectionManager } from "../../selection/SelectionManager";
import * as selector from '../../selection/ViewportSelector';
import { ViewportSelector } from '../../selection/ViewportSelector';
import { Helpers } from "../../util/Helpers";
import { Pane } from '../pane/Pane';

const near = 0.01;
const far = 1000;
const frustumSize = 20;
const fog = new THREE.Fog(0x424242, 1, 100);

export interface EditorLike extends selector.EditorLike {
    db: GeometryDatabase,
    helpers: Helpers,
    viewports: Viewport[],
    signals: EditorSignals,
    selection: SelectionManager,
    originator: EditorOriginator,
}

type Control = { enabled: boolean, dispose(): void };

export class Viewport {
    readonly overlay = new THREE.Scene();
    readonly composer: EffectComposer;
    readonly outlinePassSelection: OutlinePass;
    readonly outlinePassHover: OutlinePass;
    readonly controls = new Set<Control>();
    readonly selector: ViewportSelector;
    lastPointerEvent?: PointerEvent;
    private readonly renderPass: RenderPass;
    private readonly disposable = new CompositeDisposable();

    constructor(
        private readonly editor: EditorLike,
        readonly renderer: THREE.WebGLRenderer,
        readonly domElement: HTMLElement,
        readonly camera: THREE.Camera,
        constructionPlane: PlaneSnap,
        readonly navigationControls: OrbitControls,
        readonly grid: THREE.GridHelper,
    ) {
        this.constructionPlane = constructionPlane;
        const rendererDomElement = this.renderer.domElement;

        rendererDomElement.setAttribute("tabindex", "1");
        rendererDomElement.addEventListener('pointermove', e => {
            this.lastPointerEvent = e;
        });

        this.selector = new ViewportSelector(camera, this.renderer.domElement, editor);

        this.renderer.setPixelRatio(window.devicePixelRatio);
        const size = this.renderer.getSize(new THREE.Vector2());
        const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { format: THREE.RGBFormat });
        renderTarget.samples = 8;

        this.composer = new EffectComposer(this.renderer, renderTarget);
        this.composer.setPixelRatio(window.devicePixelRatio);

        this.renderPass = new RenderPass(editor.db.scene, this.camera);
        const overlayPass = new RenderPass(this.overlay, this.camera);
        const helpersPass = new RenderPass(editor.helpers.scene, this.camera);
        const copyPass = new ShaderPass(CopyShader);

        overlayPass.clear = false;
        overlayPass.clearDepth = true;
        helpersPass.clear = false;
        helpersPass.clearDepth = true;

        const outlinePassSelection = new OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.db.scene, this.camera);
        outlinePassSelection.edgeStrength = 5;
        outlinePassSelection.edgeGlow = 0;
        outlinePassSelection.edgeThickness = 1.0;
        outlinePassSelection.visibleEdgeColor.setHex(0xfffff00);
        this.outlinePassSelection = outlinePassSelection;

        const outlinePassHover = new OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.db.scene, this.camera);
        outlinePassHover.edgeStrength = 3;
        outlinePassHover.edgeGlow = 0;
        outlinePassHover.edgeThickness = 1.0;
        outlinePassHover.visibleEdgeColor.setHex(0xfffffff);
        this.outlinePassHover = outlinePassHover;

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.outlinePassHover);
        this.composer.addPass(this.outlinePassSelection);
        this.composer.addPass(overlayPass);
        this.composer.addPass(helpersPass);
        this.composer.addPass(copyPass);

        this.render = this.render.bind(this);
        this.setNeedsRender = this.setNeedsRender.bind(this);
        this.outlineSelection = this.outlineSelection.bind(this);
        this.outlineHover = this.outlineHover.bind(this);
        this.outlineUnhover = this.outlineUnhover.bind(this);
        this.navigationStart = this.navigationStart.bind(this);
        this.navigationEnd = this.navigationEnd.bind(this);
        this.navigationChange = this.navigationChange.bind(this);
        this.selectionStart = this.selectionStart.bind(this);
        this.selectionEnd = this.selectionEnd.bind(this);

        this.controls.add(this.selector);
        this.controls.add(this.navigationControls);

        this.disposable.add(new Disposable(() => {
            this.selector.dispose();
            this.navigationControls.dispose();
        }));
    }

    private started = false;
    start() {
        this.editor.signals.selectionChanged.add(this.outlineSelection);
        this.editor.signals.historyChanged.add(this.outlineSelection);
        this.editor.signals.objectHovered.add(this.outlineHover);
        this.editor.signals.objectUnhovered.add(this.outlineUnhover);

        this.editor.signals.selectionChanged.add(this.setNeedsRender);
        this.editor.signals.sceneGraphChanged.add(this.setNeedsRender);
        this.editor.signals.factoryUpdated.add(this.setNeedsRender);
        this.editor.signals.pointPickerChanged.add(this.setNeedsRender);
        this.editor.signals.gizmoChanged.add(this.setNeedsRender);
        this.editor.signals.objectHovered.add(this.setNeedsRender);
        this.editor.signals.objectUnhovered.add(this.setNeedsRender);
        this.editor.signals.objectAdded.add(this.setNeedsRender);
        this.editor.signals.historyChanged.add(this.setNeedsRender);

        this.navigationControls.addEventListener('change', this.setNeedsRender);
        this.navigationControls.addEventListener('start', this.navigationStart);

        this.selector.addEventListener('start', this.selectionStart);
        this.selector.addEventListener('end', this.selectionEnd);

        this.started = true;
        this.render(-1);

        this.disposable.add(new Disposable(() => {
            this.editor.signals.selectionChanged.remove(this.outlineSelection);
            this.editor.signals.historyChanged.remove(this.outlineSelection);
            this.editor.signals.objectHovered.remove(this.outlineHover);
            this.editor.signals.objectUnhovered.remove(this.outlineUnhover);

            this.editor.signals.selectionChanged.remove(this.setNeedsRender);
            this.editor.signals.sceneGraphChanged.remove(this.setNeedsRender);
            this.editor.signals.factoryUpdated.remove(this.setNeedsRender);
            this.editor.signals.pointPickerChanged.remove(this.setNeedsRender);
            this.editor.signals.gizmoChanged.remove(this.setNeedsRender);
            this.editor.signals.objectHovered.remove(this.setNeedsRender);
            this.editor.signals.objectUnhovered.remove(this.setNeedsRender);
            this.editor.signals.objectAdded.add(this.setNeedsRender);
            this.editor.signals.historyChanged.add(this.setNeedsRender);

            this.navigationControls.removeEventListener('change', this.setNeedsRender);
            this.navigationControls.removeEventListener('start', this.navigationStart);
            this.selector.removeEventListener('start', this.selectionStart);
            this.selector.removeEventListener('end', this.selectionEnd);

            this.started = false;
        }));
    }

    private needsRender = true;
    private setNeedsRender() {
        this.needsRender = true;
    }

    lastFrameNumber = -1;

    render(frameNumber: number) {
        if (!this.started) return;
        requestAnimationFrame(this.render);
        if (!this.needsRender) return;

        try {
            const scene = this.editor.db.scene;

            // prepare the scene, once per frame:
            if (frameNumber > this.lastFrameNumber) {
                this.editor.db.rebuildScene();
                scene.background = new THREE.Color(0x424242);
                scene.add(this.editor.helpers.axes);
                if (this.grid) scene.add(this.grid);
                scene.fog = fog;
                this.editor.selection.highlight();
            }

            const resolution = new THREE.Vector2(this.offsetWidth, this.offsetHeight);
            this.editor.signals.renderPrepared.dispatch({ camera: this.camera, resolution });

            this.composer.render();

            if (frameNumber > this.lastFrameNumber) {
                this.editor.selection.unhighlight();
                if (this.grid) scene.remove(this.grid);
                scene.remove(this.editor.helpers.axes);
            }
        } finally {
            this.needsRender = false;
            this.lastFrameNumber = frameNumber;
        }
    }

    outlineSelection() {
        const selected = this.editor.selection.selected;
        const toOutline = [...selected.solids].flatMap(item => item.outline);
        this.outlinePassSelection.selectedObjects = toOutline;
    }

    outlineHover(object?: SpaceItem | TopologyItem | ControlPoint | Region) {
        if (object instanceof Solid) {
            this.outlinePassHover.selectedObjects = object.outline;
        }
    }

    outlineUnhover(object?: SpaceItem | TopologyItem | ControlPoint | Region) {
        this.outlinePassHover.selectedObjects = [];
    }

    private offsetWidth: number = 100;
    private offsetHeight: number = 100;

    setSize(offsetWidth: number, offsetHeight: number) {
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;

        const { camera } = this;
        const aspect = offsetWidth / offsetHeight;
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.aspect = aspect;
        } else if (camera instanceof THREE.OrthographicCamera) {
            camera.left = frustumSize * aspect / - 2;
            camera.right = frustumSize * aspect / 2;
        } else throw new Error("Invalid camera");
        camera.updateProjectionMatrix();

        this.renderer.setSize(offsetWidth, offsetHeight);
        this.composer.setSize(offsetWidth, offsetHeight);
        this.outlinePassHover.setSize(offsetWidth, offsetHeight);
        this.outlinePassSelection.setSize(offsetWidth, offsetHeight);
        this.setNeedsRender();
    }

    disableControlsExcept(except?: Control) {
        for (const control of this.controls) {
            if (control === except) continue;
            control.enabled = false;
        }
    }

    enableControls() {
        for (const control of this.controls) {
            control.enabled = true;
        }
    }

    private navigationStart() {
        this.navigationControls.addEventListener('change', this.navigationChange);
        this.navigationControls.addEventListener('end', this.navigationEnd);
        this.editor.signals.viewportActivated.dispatch(this);
    }

    private navigationChange() {
        this.disableControlsExcept(this.navigationControls);
        this.constructionPlane.update(this.camera);
    }

    private navigationEnd() {
        this.enableControls();
        this.navigationControls.removeEventListener('change', this.navigationChange);
        this.navigationControls.removeEventListener('end', this.navigationEnd);
    }

    private selectionStart() {
        this.editor.signals.viewportActivated.dispatch(this);
    }

    private selectionEnd() { }

    setAttribute(name: string, value: string) {
        this.domElement.setAttribute(name, value);
    }

    removeAttribute(name: string) {
        this.domElement.removeAttribute(name);
    }

    dispose() {
        this.disposable.dispose();
    }

    private _constructionPlane!: PlaneSnap;
    get constructionPlane() { return this._constructionPlane }
    set constructionPlane(plane: PlaneSnap) {
        this._constructionPlane = plane;
        this.grid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), plane.n);
        this.setNeedsRender();
        if (this.constructionPlane instanceof CameraPlaneSnap) {
            this.grid.visible = false;
        } else {
            this.grid.visible = true;
        }
    }

    toggleConstructionPlane() {
        if (this.constructionPlane instanceof CameraPlaneSnap) {
            this.constructionPlane = new ConstructionPlaneSnap(new THREE.Vector3(0, 0, 1));
        } else {
            this.constructionPlane = new CameraPlaneSnap(this.camera);
        }
    }
}

export interface ViewportElement {
    readonly model: Viewport;
}

export default (editor: EditorLike) => {
    class ViewportElement extends HTMLElement implements ViewportElement {
        readonly model: Viewport;

        constructor() {
            super();

            const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
            const grid = new THREE.GridHelper(300, 300, 0x666666, 0x666666);
            grid.renderOrder = -1;
            grid.layers.set(visual.Layers.Overlay);

            this.append(renderer.domElement);

            const view = this.getAttribute("view");
            const orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, near, far);
            orthographicCamera.zoom = 3;
            const perspectiveCamera = new THREE.PerspectiveCamera(frustumSize, 1, near, far);

            let camera: THREE.Camera;
            let n: THREE.Vector3;
            let enableNavControls = false;
            switch (view) {
                case "3d":
                    camera = orthographicCamera;
                    camera.position.set(-5, 15, 5);
                    n = new THREE.Vector3(0, 0, 1);
                    enableNavControls = true;
                    break;
                case "top":
                    camera = orthographicCamera;
                    camera.position.set(0, 0, 10);
                    n = new THREE.Vector3(0, 0, 1);
                    break;
                case "right":
                    camera = orthographicCamera;
                    camera.position.set(10, 0, 0);
                    n = new THREE.Vector3(1, 0, 0);
                    break;
                case "front":
                default:
                    camera = orthographicCamera;
                    camera.position.set(0, 10, 0);
                    n = new THREE.Vector3(0, 1, 0);
                    break;
            }
            camera.layers = visual.VisibleLayers;

            const navigationControls = new OrbitControls(camera, renderer.domElement);
            navigationControls.enableRotate = enableNavControls;
            navigationControls.mouseButtons = {
                // @ts-expect-error
                LEFT: undefined,
                MIDDLE: THREE.MOUSE.ROTATE,
                RIGHT: THREE.MOUSE.PAN
            }

            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            camera.updateMatrixWorld();

            const constructionPlane = new PlaneSnap(n);

            this.model = new Viewport(
                editor,
                renderer,
                this,
                camera,
                constructionPlane,
                navigationControls,
                grid,
            );

            this.resize = this.resize.bind(this);
        }

        connectedCallback() {
            editor.viewports.push(this.model);

            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);

            this.model.start();
        }

        disconnectedCallback() {
            this.model.dispose();
        }

        resize() {
            this.model.setSize(this.offsetWidth, this.offsetHeight);
        }
    }

    customElements.define('ispace-viewport', ViewportElement);
}