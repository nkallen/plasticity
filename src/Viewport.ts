import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Editor } from './editor';
import { Pane } from './Pane';

const near = 0.01;
const far = 1000;
const frustumSize = 20;

const planeGeo = new THREE.PlaneGeometry(1000, 1000, 2, 2);
const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });

export default (editor: Editor) => {
    class Viewport extends HTMLElement {
        camera: THREE.Camera;
        renderer = new THREE.WebGLRenderer({ antialias: true });
        controls?: OrbitControls;
        constructionPlane = new THREE.Mesh(planeGeo, planeMat);

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            let camera: THREE.Camera;

            const view = this.getAttribute("view");
            const aspect = this.offsetWidth / this.offsetHeight;
            const orthographicCamera = new THREE.OrthographicCamera(-frustumSize/2, frustumSize/2, frustumSize/2, -frustumSize/2, near, far);
            const perspectiveCamera = new THREE.PerspectiveCamera(frustumSize, aspect, near, far);
            switch (view) {
                case "3d":
                    camera = perspectiveCamera;
                    camera.position.set(0, 20, 5);
                    this.controls = new OrbitControls(camera, this.renderer.domElement);
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
            camera.up.set(0,0,1);
            camera.lookAt(new THREE.Vector3());
            this.camera = camera;

            this.shadowRoot!.append(this.renderer.domElement);

            this.resize = this.resize.bind(this);
        }

        connectedCallback() {
            const scene = editor.scene;
            scene.background = new THREE.Color(0x424242);

            this.renderer.setPixelRatio(window.devicePixelRatio);

            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);
            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.viewports.push(this);


            const grid = new THREE.GridHelper(300, 300, 0x666666);
            grid.rotateX(Math.PI/2);
            const material1 = grid.material as THREE.LineBasicMaterial;
            material1.color.setHex(0x888888);
            material1.vertexColors = false;

            scene.fog = new THREE.Fog(0x424242, 1, 75);

            scene.add(grid);

            const renderer = this.renderer;
            const camera = this.camera;
            function animate() {
                requestAnimationFrame(animate);
                // this.controls?.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
                renderer.render(scene, camera);
            }

            animate();
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
        }
    }

    customElements.define('ispace-viewport', Viewport);
}