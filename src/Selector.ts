import signals from "signals";
import * as THREE from "three";
import { VisualModel } from "./VisualModel";
class SelectorSignals {
    clicked: signals.Signal<THREE.Intersection[]>;
}

export class Selector extends THREE.EventDispatcher {
    readonly drawModel: Set<VisualModel>;
    readonly camera: THREE.Camera;
    readonly domElement: HTMLElement;
    readonly signals: SelectorSignals = {
        clicked: new signals.Signal()
    }

    enabled = true; // FIXME make work

    // FIXME add dispose
    constructor(drawModel: Set<VisualModel>, camera: THREE.Camera, domElement: HTMLElement) {
        super();

        this.drawModel = drawModel;
        this.camera = camera;
        this.domElement = domElement;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown, false);
    }

    onDownPosition = new THREE.Vector2();
    onPointerDown(event: PointerEvent) {
        const domElement = this.domElement;
        var array = this.getMousePosition(domElement, event.clientX, event.clientY);
        this.onDownPosition.fromArray(array);

        document.addEventListener('pointerup', this.onPointerUp, false);
    }

    onUpPosition = new THREE.Vector2();
    onPointerUp(event: PointerEvent) {
        const domElement = this.domElement;
        var array = this.getMousePosition(domElement, event.clientX, event.clientY);
        this.onUpPosition.fromArray(array);

        this.handleClick();

        document.removeEventListener('pointerup', this.onPointerUp, false);
    }

    getMousePosition(dom: HTMLElement, x: number, y: number) {
        var rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    handleClick() {
        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            var intersects = this.getIntersects(this.onUpPosition, [...this.drawModel]);

            let object: THREE.Object3D = null;
            if (intersects.length > 0) {
                object = intersects[0].object;
            }

            this.signals.clicked.dispatch(intersects);
        }
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);

        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(objects, true);
    }
}