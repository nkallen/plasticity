import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EditorLike, Viewport } from '../src/components/viewport/Viewport';
import { PlaneSnap } from '../src/editor/SnapManager';

class FakeWebGLRenderer implements THREE.Renderer {
    constructor(readonly domElement = document.createElement("canvas")) { }

    render(scene: THREE.Object3D, camera: THREE.Camera): void { }
    setSize(width: number, height: number, updateStyle?: boolean): void { }

    getPixelRatio(): number {
        throw new Error("Method not implemented.");
    };

    setPixelRatio(value: number): void { };

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
    const camera = new THREE.PerspectiveCamera();
    const viewport = new Viewport(
        editor,
        new FakeWebGLRenderer(canvas) as unknown as THREE.WebGLRenderer,
        document.createElement('ispace-viewport'),
        camera,
        new PlaneSnap(),
        new OrbitControls(camera, canvas),
        new THREE.GridHelper()
    );
    viewport.lastPointerEvent = new MouseEvent('pointermove', { clientX: 0, clientY: 0 }) as PointerEvent;
    return viewport;
}