import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Editor } from './editor';
import { Pane } from './Pane';

export default (editor: Editor) => {
    class Viewport extends HTMLElement {
        camera: THREE.PerspectiveCamera;
        renderer = new THREE.WebGLRenderer({ antialias: true });

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
            camera.position.set(0, 5, 10);
            camera.lookAt(new THREE.Vector3());
            this.camera = camera;

            this.shadowRoot!.append(this.renderer.domElement);

            this.resize = this.resize.bind(this);
        }

        connectedCallback() {
            const scene = editor.scene;
            scene.background = new THREE.Color(0x424242);

            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(this.offsetWidth, this.offsetHeight);

            editor.signals.windowLoaded.add(this.resize);
            editor.signals.windowResized.add(this.resize);
            const pane = this.parentElement as Pane;
            pane.signals.flexScaleChanged.add(this.resize);
            editor.viewports.push(this);

            const controls = new OrbitControls(this.camera, this.renderer.domElement);

            const grid = new THREE.GridHelper(300, 300, 0x666666);
            const material1 = grid.material as THREE.LineBasicMaterial;
            material1.color.setHex(0x888888);
            material1.vertexColors = false;

            scene.fog = new THREE.Fog(0x424242, 1, 75);

            scene.add(grid);

            const r = this.renderer;
            const camera = this.camera;
            function animate() {
                requestAnimationFrame(animate);
                controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
                r.render(scene, camera);
            }

            animate();
        }

        resize() {
            this.renderer.setSize(this.offsetWidth, this.offsetHeight);
            this.camera.aspect = this.offsetWidth / this.offsetHeight;
            this.camera.updateProjectionMatrix();
        }
    }

    customElements.define('ispace-viewport', Viewport);
}