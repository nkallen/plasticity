import { Camera, MOUSE, TOUCH, Vector3 } from '../../../src/Three';

export class OrbitControls {
    constructor(object: Camera, domElement?: HTMLElement, keymaps: AtomKeymap.KeymapManager);

    object: Camera;
    domElement: HTMLElement | HTMLDocument;

    // API
    enabled: boolean;
    target: Vector3;

    minDistance: number;
    maxDistance: number;

    minZoom: number;
    maxZoom: number;

    minPolarAngle: number;
    maxPolarAngle: number;

    minAzimuthAngle: number;
    maxAzimuthAngle: number;

    enableDamping: boolean;
    dampingFactor: number;

    enableZoom: boolean;
    zoomSpeed: number;

    enableRotate: boolean;
    rotateSpeed: number;

    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    keyPanSpeed: number;

    autoRotate: boolean;
    autoRotateSpeed: number;

    enableKeys: boolean;
    keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
    mouseButtons: Record<string, string>;
    touches: { ONE: TOUCH; TWO: TOUCH };

    focus(targets: THREE.Object[], everything: THREE.Object[]): void;

    update(): boolean;

    listenToKeyEvents(domElement: HTMLElement): void;

    saveState(): void;

    reset(): void;

    dispose(): void;

    getPolarAngle(): number;

    getAzimuthalAngle(): number;

    getDistance(): number;

    // EventDispatcher mixins
    addEventListener(type: string, listener: (event: any) => void): void;

    hasEventListener(type: string, listener: (event: any) => void): boolean;

    removeEventListener(type: string, listener: (event: any) => void): void;

    dispatchEvent(event: { type: string; target: any }): void;
}

