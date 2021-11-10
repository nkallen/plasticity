import * as THREE from "three";
import * as visual from "../../../editor/VisualModel";
import { Viewport } from "../Viewport";

export class GPUPicker {
    static minimumEntityId = 1;

    private readonly scene = new THREE.Scene();
    private objects: THREE.Object3D[] = [];
    readonly pickingTarget = new THREE.WebGLRenderTarget(1, 1);
    pickingBuffer: Readonly<Uint8Array> = new Uint8Array();

    layers = new THREE.Layers();

    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 1 }
    };

    constructor(private readonly viewport: Viewport) {
        this.render = this.render.bind(this);
    }

    setSize(offsetWidth: number, offsetHeight: number) {
        this.pickingTarget.setSize(offsetWidth, offsetHeight);
        this.pickingBuffer = new Uint8Array(offsetWidth * offsetHeight * 4);
        this.render();
    }

    update(scene: THREE.Object3D[]) {
        this.objects = scene;
        this.render();
    }

    render() {
        const { viewport: { renderer, camera }, objects, scene, pickingTarget, pickingBuffer } = this;

        console.time();
        renderer.setRenderTarget(pickingTarget);
        for (const object of objects) scene.add(object);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(pickingTarget, 0, 0, camera.offsetWidth, camera.offsetHeight, pickingBuffer);
        console.timeEnd();
    }

    show() {
        const { viewport: { renderer, camera }, objects, scene } = this;
        renderer.setRenderTarget(null);
        for (const object of objects) scene.add(object);
        renderer.render(scene, camera);
    }

    private readonly screenPoint = new THREE.Vector2();
    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.screenPoint.copy(screenPoint);
    }

    intersect(): { id: number, position: THREE.Vector3 } | undefined {
        const { viewport, screenPoint } = this;
        let i = (screenPoint.x | 0) + ((screenPoint.y | 0) * viewport.camera.offsetWidth);

        const buffer = new Uint32Array(this.pickingBuffer.buffer);
        const id = buffer[i];
        if (id === 0 || id === undefined) return undefined;
        return { id, position: new THREE.Vector3() };
    }

    static compactTopologyId(type: 'edge' | 'face', parentId: number, index: number): number {
        if (parentId > (1 << 16)) throw new Error("precondition failure");
        if (index > (1 << 15)) throw new Error("precondition failure");

        parentId <<= 16;
        const c = (type === 'edge' ? 0 : 1) << 7;
        const d = c | ((index >> 8) & 0xef);
        const e = ((index >> 0) & 255);

        const id = parentId | (d << 8) | e;
        return id;
    }

    static extract(compact: number) {
        const parentId = compact >> 16;
        compact &= 0xffff;
        const type = compact >> 15;
        compact &= 0x7fff;
        const index = compact;
        return { parentId, type, index };
    }

    static compact2full(compact: number): string {
        const { parentId, type, index } = this.extract(compact);
        return type === 0 ? visual.CurveEdge.simpleName(parentId, index) : visual.Face.simpleName(parentId, index);
    }
}

