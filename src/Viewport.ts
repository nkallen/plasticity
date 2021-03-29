import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Editor } from './Editor';
import { Pane } from './Pane';
import { Selector } from './Selector';

import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';

const near = 0.01;
const far = 1000;
const frustumSize = 20;

const planeGeo = new THREE.PlaneGeometry(1000, 1000, 2, 2);
const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });

export default (editor: Editor) => {
    class Viewport extends HTMLElement {
        readonly camera: THREE.Camera;
        readonly renderer = new THREE.WebGLRenderer({ antialias: false });
        readonly controls?: OrbitControls;
        readonly selector: Selector;
        readonly constructionPlane = new THREE.Mesh(planeGeo, planeMat);
        composer: EffectComposer;

        outlinePass: OutlinePass;

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
                    this.controls = new OrbitControls(camera, domElement);
                    this.constructionPlane.lookAt(0, 0, 1);
                    break;
                case "top":
                    camera = orthographicCamera;
                    camera.position.set(0, 0, 10);
                    this.constructionPlane.lookAt(0, 0, 1);
                    break;
                case "front":
                    camera = orthographicCamera;
                    camera.position.set(0, 10, 0);
                    this.constructionPlane.lookAt(0, 1, 0);
                    break;
                case "right":
                    camera = orthographicCamera;
                    camera.position.set(10, 0, 0);
                    this.constructionPlane.lookAt(1, 0, 0);
                    break;
            }
            camera.up.set(0, 0, 1);
            camera.lookAt(new THREE.Vector3());
            this.camera = camera;
            this.selector = new Selector(editor.drawModel, camera, this.renderer.domElement);

            this.renderer.setPixelRatio(window.devicePixelRatio);
            const size = this.renderer.getSize(new THREE.Vector2());
            const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.width, size.height, { format: THREE.RGBFormat });
            renderTarget.samples = 8;

            this.composer = new EffectComposer(this.renderer, renderTarget);
            this.composer.setPixelRatio(window.devicePixelRatio);

            const renderPass = new RenderPass(editor.scene, this.camera);
            const copyPass = new ShaderPass(CopyShader);

            const outlinePass = new OutlinePass(new THREE.Vector2(this.offsetWidth, this.offsetHeight), editor.scene, this.camera);
            outlinePass.edgeStrength = 3;
            outlinePass.edgeGlow = 1;
            outlinePass.edgeThickness = 1.0;
            this.outlinePass = outlinePass;

            this.composer.addPass(renderPass);
            this.composer.addPass(this.outlinePass);
            this.composer.addPass(copyPass);

            this.shadowRoot!.append(domElement);

            this.outline = this.outline.bind(this);
            this.resize = this.resize.bind(this);
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            editor.viewports.push(this);

            const scene = editor.scene;
            scene.background = new THREE.Color(0x424242);

            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);

            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);
            editor.signals.objectSelected.add(this.outline);
            editor.signals.objectSelected.add(this.render);
            editor.signals.objectDeselected.add(this.outline);
            editor.signals.objectDeselected.add(this.render);
            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.commandUpdated.add(this.render);
            editor.signals.pointPickerChanged.add(this.render);

            const grid = new THREE.GridHelper(300, 300, 0x666666);
            grid.rotateX(Math.PI / 2);
            const material1 = grid.material as THREE.LineBasicMaterial;
            material1.color.setHex(0x888888);
            material1.vertexColors = false;

            scene.fog = new THREE.Fog(0x424242, 1, 250);

            scene.add(grid);

            this.controls?.addEventListener('change', this.render);
            this.selector.addEventListener('change', (event) => { // FIXME reconsider whether to use a signal
                const selection = event.value;
                if (selection != null) editor.select(selection);
                else editor.deselectAll();
            });
        }

        render() {
            editor.materialDatabase.setResolution(this.offsetWidth, this.offsetHeight);
            this.composer.render();
        }

        outline(o: THREE.Object3D) {
            if (o == null) this.outlinePass.selectedObjects = [];
            else this.outlinePass.selectedObjects = [...editor.selected];
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

            this.renderer.setSize(this.offsetWidth, this.offsetHeight);
            this.composer.setSize(this.offsetWidth, this.offsetHeight);
            this.render();
        }
    }

    customElements.define('ispace-viewport', Viewport);
}