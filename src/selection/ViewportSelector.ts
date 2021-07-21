import { CancelOrFinish } from "../commands/CommandExecutor";
import * as THREE from "three";
import Command, * as cmd from "../commands/Command";
import { ChangeSelectionCommand } from "../commands/CommandLike";
import { EditorOriginator } from "../editor/History";
import * as visual from "../editor/VisualModel";

export interface EditorLike extends cmd.EditorLike {
    originator: EditorOriginator,
    enqueue(command: Command, cancelOrFinish?: CancelOrFinish): void;
}

export class ViewportSelector extends THREE.EventDispatcher {
    private readonly raycaster = new THREE.Raycaster();
    private readonly mouse = new THREE.Vector2();

    private readonly onDownPosition = new THREE.Vector2();
    private readonly onUpPosition = new THREE.Vector2();

    enabled = true;

    // FIXME add dispose
    constructor(
        private readonly camera: THREE.Camera,
        private readonly domElement: HTMLElement,
        private readonly editor: EditorLike,
    ) {
        super();

        // @ts-expect-error("Line2 is missing from the typedef")
        this.raycaster.params.Line2 = { threshold: 10 };
        this.raycaster.params.Mesh.threshold = 0;
        this.raycaster.layers = visual.EnabledLayers;
        // this.raycaster.layers.enable(visual.Layers.Solid);

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerHover = this.onPointerHover.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown, false);
        domElement.addEventListener('pointermove', this.onPointerHover);
    }

    onPointerDown(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onDownPosition.fromArray(array);

        document.addEventListener('pointerup', this.onPointerUp, false);
    }

    onPointerHover(event: PointerEvent): void {
        if (!this.enabled) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        const point = new THREE.Vector2();
        point.fromArray(array);
        const intersects = this.getIntersects(point, [...this.editor.db.visibleObjects]);
        this.editor.signals.hovered.dispatch(intersects);
    }

    onPointerUp(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onUpPosition.fromArray(array);

        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            const intersects = this.getIntersects(this.onUpPosition, [...this.editor.db.visibleObjects]);

            const command = new ChangeSelectionCommand(this.editor, intersects);
            this.editor.enqueue(command, 'finish');
        }

        document.removeEventListener('pointerup', this.onPointerUp, false);
    }

    private getMousePosition(dom: HTMLElement, x: number, y: number) {
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(objects, false); // FIXME reconsider non-recursive
    }
}