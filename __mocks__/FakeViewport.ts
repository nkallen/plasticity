import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EditorLike, Viewport } from '../src/components/viewport/Viewport';
import { PlaneSnap } from '../src/editor/SnapManager';

class FakeWebGLRenderer implements THREE.Renderer {
    constructor(readonly domElement = document.createElement("canvas")) { }

    render(scene: THREE.Object3D, camera: THREE.Camera): void { }
    setSize(width: number, height: number, updateStyle?: boolean): void { }

    getPixelRatio() { return 1 };

    getViewport() { return new THREE.Vector4() }
    setViewport(v: THREE.Vector4 ) { }

    setPixelRatio(value: number) { }

    getSize(target: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2();
    };

    getRenderTarget() { return null }
    setRenderTarget() { }
    clear() { }
    clearDepth() { }
    getClearColor() { }
    getClearAlpha() { }
}

export function MakeViewport(editor: EditorLike) {
    const canvas = document.createElement('canvas');
    // @ts-expect-error('Cannot mock DomRect')
    canvas.getBoundingClientRect = () => { return { left: 0, top: 0, width: 100, height: 100 } };
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1);
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    const domElement = document.createElement('ispace-viewport');
    const viewport = new Viewport(
        editor,
        new FakeWebGLRenderer(canvas) as unknown as THREE.WebGLRenderer,
        domElement,
        camera,
        new PlaneSnap(),
        new OrbitControls(camera, canvas),
        new THREE.GridHelper()
    );
    viewport.lastPointerEvent = new MouseEvent('pointermove', { clientX: 0, clientY: 0 }) as PointerEvent;
    return viewport;
}