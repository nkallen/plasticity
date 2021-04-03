import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Editor } from './Editor';
import { Pane } from './Pane';
import { ViewportSelector } from './selection/ViewportSelector';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { Item, Solid, SpaceItem } from "./VisualModel";
import { PlaneSnap } from "./SnapManager";

const near = 0.01;
const far = 1000;
const frustumSize = 20;

export interface Viewport {
    renderer: THREE.Renderer;
    camera: THREE.Camera;
    constructionPlane: PlaneSnap;
    enableControls(): void;
    disableControls(): void;
    overlay: THREE.Scene;
}

export default (editor: Editor) => {
    // FIXME rename
    class _Viewport extends HTMLElement {
        readonly camera: THREE.Camera;
        readonly overlayCamera: THREE.OrthographicCamera;
        readonly overlay = new THREE.Scene();
        readonly renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        readonly navigationControls?: OrbitControls;
        readonly selector: ViewportSelector;
        readonly constructionPlane: PlaneSnap;
        readonly composer: EffectComposer;
        readonly outlinePassSelection: OutlinePass;
        readonly outlinePassHover: OutlinePass;
        readonly controls = new Set<{ enabled: boolean }>();
        readonly grid: THREE.Object3D;

        constructor() {
            super();

            this.attachShadow({ mode: 'open' });

            let camera: THREE.Camera;

            const view = this.getAttribute("view");
            const aspect = this.offsetWidth / this.offsetHeight;
            const orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, near, far);
            const perspectiveCamera = new THREE.PerspectiveCamera(frustumSize, aspect, near, far);
            const domElement = this.renderer.domElement;
            switch (view) {
                case "3d":
                    camera = perspectiveCamera;
                    camera.position.set(0, 20, 5);
                    this.navigationControls = new OrbitControls(camera, domElement);
                    this.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
                    break;
                case "top":
                    camera = orthographicCamera;
                    camera.position.set(0, 0, 10);
                    this.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
                    break;
                case "front":
                    camera = orthographicCamera;
                    camera.position.set(0, 10, 0);
                    this.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 1, 0));
                    break;
                case "right":
                    camera = orthographicCamera;
                    camera.position.set(10, 0, 0);
                    this.constructionPlane = new PlaneSnap(new THREE.Vector3(1, 0, 0));
                    break;
            }

            const grid = new THREE.GridHelper(300, 300, 0x666666);
            grid.rotateX(Math.PI / 2);
            const material1 = grid.material as THREE.LineBasicMaterial;
            material1.color.setHex(0x888888);
            material1.vertexColors = false;
            material1.depthFunc = THREE.NeverDepth;
            grid.renderOrder = -1;
            this.grid = grid;

            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            this.camera = camera;
            this.selector = new ViewportSelector(editor.drawModel, camera, this.renderer.domElement);

            this.renderer.setPixelRatio(window.devicePixelRatio);
            const size = this.renderer.getSize(new THREE.Vector2());
            const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { format: THREE.RGBFormat });
            renderTarget.samples = 8;

            this.composer = new EffectComposer(this.renderer, renderTarget);
            this.composer.setPixelRatio(window.devicePixelRatio);

            this.overlayCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, near, far);

            const renderPass = new RenderPass(editor.scene, this.camera);
            const overlayPass = new RenderPass(this.overlay, this.camera);
            const copyPass = new ShaderPass(CopyShader);

            overlayPass.clear = false;
            overlayPass.clearDepth = true;

            const outlinePassSelection = new OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.scene, this.camera);
            outlinePassSelection.edgeStrength = 10;
            outlinePassSelection.edgeGlow = 0;
            outlinePassSelection.edgeThickness = 2.0;
            outlinePassSelection.visibleEdgeColor.setHex(0xfffff00);
            this.outlinePassSelection = outlinePassSelection;

            const outlinePassHover = new OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.scene, this.camera);
            outlinePassHover.edgeStrength = 10;
            outlinePassHover.edgeGlow = 0;
            outlinePassHover.edgeThickness = 2.0;
            outlinePassHover.visibleEdgeColor.setHex(0xfffffff);
            this.outlinePassHover = outlinePassHover;

            this.composer.addPass(renderPass);
            this.composer.addPass(this.outlinePassHover);
            this.composer.addPass(this.outlinePassSelection);
            this.composer.addPass(overlayPass);
            this.composer.addPass(copyPass);

            this.shadowRoot!.append(domElement);

            this.outlineSelection = this.outlineSelection.bind(this);
            this.outlineHover = this.outlineHover.bind(this);
            this.resize = this.resize.bind(this);
            this.render = this.render.bind(this);

            if (this.navigationControls) this.controls.add(this.navigationControls)
            this.controls.add(this.selector);
        }

        connectedCallback() {
            editor.viewports.push(this);

            const scene = editor.scene;

            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);

            editor.signals.objectSelected.add(this.outlineSelection);
            editor.signals.objectDeselected.add(this.outlineSelection);
            editor.signals.objectHovered.add(this.outlineHover);

            editor.signals.objectSelected.add(this.render);
            editor.signals.objectDeselected.add(this.render);
            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.commandUpdated.add(this.render);
            editor.signals.pointPickerChanged.add(this.render);
            editor.signals.objectHovered.add(this.render);
            editor.signals.objectAdded.add(this.render);

            scene.fog = new THREE.Fog(0x424242, 1, 100);

            this.navigationControls?.addEventListener('change', this.render);
            this.selector.signals.clicked.add((intersections) => editor.selectionManager.onClick(intersections));
            this.selector.signals.hovered.add((intersections) => editor.selectionManager.onPointerMove(intersections));
        }

        render() {
            editor.materialDatabase.setResolution(this.offsetWidth, this.offsetHeight);

            this.overlayCamera.position.copy(this.camera.position);

            // Adding/removing grid to scene so materials with depthWrite false
            // don't render under the grid.
            editor.scene.add(this.grid);
            this.composer.render();
            editor.scene.remove(this.grid);

            // this.renderer.autoClear = false;
            // if (showSceneHelpers === true) renderer.render(sceneHelpers, camera);
            // this.renderer.autoClear = true;
        }

        outlineSelection() {
            const selectionManager = editor.selectionManager;
            const toOutline = [...selectionManager.selectedSolids].map((item) => item.faces);
            this.outlinePassSelection.selectedObjects = toOutline;
        }

        outlineHover(object?: SpaceItem) {
            if (object == null) this.outlinePassHover.selectedObjects = [];
            else if (object instanceof Solid) this.outlinePassHover.selectedObjects = [object.faces];
        }

        resize() {
            const aspect = this.offsetWidth / this.offsetHeight;
            if (this.camera instanceof THREE.PerspectiveCamera) {
                this.camera.aspect = aspect;
                this.camera.updateProjectionMatrix();
            } else if (this.camera instanceof THREE.OrthographicCamera) {
                this.camera.left = frustumSize * aspect / - 2;
                this.camera.right = frustumSize * aspect / 2;
                this.camera.updateProjectionMatrix();
            }

            this.overlayCamera.left = frustumSize * aspect / - 2;
            this.overlayCamera.right = frustumSize * aspect / 2;
            this.overlayCamera.updateProjectionMatrix();

            this.renderer.setSize(this.offsetWidth, this.offsetHeight);
            this.composer.setSize(this.offsetWidth, this.offsetHeight);
            this.render();
        }

        disableControls() {
            for (var control of this.controls) {
                control.enabled = false;
            }
        }

        enableControls() {
            for (var control of this.controls) {
                control.enabled = true;
            }
        }
    }

    customElements.define('ispace-viewport', _Viewport);
}