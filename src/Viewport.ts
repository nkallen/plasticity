import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Editor } from './editor';
import { Pane } from './Pane';

const near = 0.01;
const far = 1000;

export default (editor: Editor) => {
    class Viewport extends HTMLElement {
        camera: THREE.Camera;
        renderer = new THREE.WebGLRenderer({ antialias: true });
        controls?: OrbitControls;

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            const view = this.getAttribute("view");
            let camera: THREE.Camera;
            switch (view) {
                case "3d":
                    camera = new THREE.PerspectiveCamera(50, 1, near, far);
                    camera.position.set(0, 5, 10);
                    this.controls = new OrbitControls(camera, this.renderer.domElement);
                    break;
                case "top":
                    camera = new THREE.OrthographicCamera(-10, 10, -10, 10, near, far);
                    camera.position.set(0, 0, 10);
                    break;
                case "front":
                    camera = new THREE.OrthographicCamera(-10, 10, -10, 10, near, far);
                    camera.position.set(0, 10, 0);
                    break;
                case "right":
                    camera = new THREE.OrthographicCamera(-10, 10, -10, 10, near, far);
                    camera.position.set(10, 0, 0);
                    break;
            }
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
            this.renderer.setSize(this.offsetWidth, this.offsetHeight);
            if (this.camera instanceof THREE.PerspectiveCamera) {
                this.camera.aspect = this.offsetWidth / this.offsetHeight;
                this.camera.updateProjectionMatrix();
            }
        }
    }

    customElements.define('ispace-viewport', Viewport);
}