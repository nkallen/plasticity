import * as THREE from 'three';
import { OrbitControls } from '../src/components/viewport/OrbitControls';
import { ProxyCamera } from '../src/components/viewport/ProxyCamera';
import { EditorLike, Viewport } from '../src/components/viewport/Viewport';
import { ConstructionPlaneSnap, PlaneSnap } from '../src/editor/snaps/Snap';

class FakeWebGLRenderer implements THREE.Renderer {
    constructor(readonly domElement = document.createElement("canvas")) { }

    render(scene: THREE.Object3D, camera: THREE.Camera): void { }
    setSize(width: number, height: number, updateStyle?: boolean): void { }

    getPixelRatio() { return 1 };

    getViewport() { return new THREE.Vector4() }
    setViewport(v: THREE.Vector4) { }

    setPixelRatio(value: number) { }

    getSize(target: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2();
    };

    setAnimationLoop(fn: (x: number) => void) {

    }

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
    canvas.setPointerCapture = (pointerId: number) => { };
    const camera = new ProxyCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    const domElement = document.createElement('ispace-viewport');
    // @ts-expect-error('Cannot mock DomRect')
    domElement.getBoundingClientRect = () => { return { left: 0, top: 0, width: 100, height: 100 } };

    Object.defineProperties(canvas, {
        offsetWidth: { get() { return 100 } },
        offsetHeight: { get() { return 100 } }
    });
    editor.signals.renderPrepared.dispatch({ camera, resolution: new THREE.Vector2(100, 100) })

    domElement.appendChild(canvas);
    const viewport = new Viewport(
        editor,
        new FakeWebGLRenderer(canvas) as unknown as THREE.WebGLRenderer,
        domElement,
        camera,
        new ConstructionPlaneSnap(),
        new OrbitControls(camera, canvas, editor.keymaps),
    );
    viewport.lastPointerEvent = new MouseEvent('pointermove', { clientX: 0, clientY: 0 }) as PointerEvent;
    return viewport;
}