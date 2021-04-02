import signals from "signals";
import * as THREE from "three";
import { SpaceItem } from "./VisualModel";

class SelectorSignals {
    clicked: signals.Signal<THREE.Intersection[]>;
    hovered: signals.Signal<THREE.Intersection[]>;
}

export class Selector extends THREE.EventDispatcher {
    private readonly drawModel: Set<SpaceItem>;
    private readonly camera: THREE.Camera;
    private readonly domElement: HTMLElement;
    private readonly raycaster = new THREE.Raycaster();
    private readonly mouse = new THREE.Vector2();

    private readonly onDownPosition = new THREE.Vector2();
    private readonly onUpPosition = new THREE.Vector2();

    enabled = true;

    readonly signals: SelectorSignals = {
        clicked: new signals.Signal(),
        hovered: new signals.Signal()
    }

    // FIXME add dispose
    constructor(drawModel: Set<SpaceItem>, camera: THREE.Camera, domElement: HTMLElement) {
        super();

        this.drawModel = drawModel;
        this.camera = camera;
        this.domElement = domElement;

        // @ts-ignore
        this.raycaster.params.Line2 = { threshold: 10 };
        this.raycaster.params.Mesh.threshold = 0;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerHover = this.onPointerHover.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown, false);
        domElement.addEventListener('pointermove', this.onPointerHover);
    }

    onPointerDown(event: PointerEvent) {
        if (!this.enabled) return;

        var array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onDownPosition.fromArray(array);

        document.addEventListener('pointerup', this.onPointerUp, false);
    }

    onPointerHover(event: PointerEvent) {
        if (!this.enabled) return;

        var array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        const point = new THREE.Vector2();
        point.fromArray(array);
        const intersects = this.getIntersects(point, [...this.drawModel]);
        this.signals.hovered.dispatch(intersects);
    }

    onPointerUp(event: PointerEvent) {
        if (!this.enabled) return;

        var array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onUpPosition.fromArray(array);

        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            const intersects = this.getIntersects(this.onUpPosition, [...this.drawModel]);

            this.signals.clicked.dispatch(intersects);
        }

        document.removeEventListener('pointerup', this.onPointerUp, false);
    }

    private getMousePosition(dom: HTMLElement, x: number, y: number) {
        var rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(objects, true);
    }
}