import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command, * as cmd from "../commands/Command";
import { CancelOrFinish } from "../commands/CommandExecutor";
import { ChangeSelectionCommand } from "../commands/CommandLike";
import { EditorSignals } from "../editor/EditorSignals";
import { GeometryDatabase } from "../editor/GeometryDatabase";
import { EditorOriginator } from "../editor/History";
import * as visual from "../editor/VisualModel";

export interface EditorLike extends cmd.EditorLike {
    originator: EditorOriginator,
    enqueue(command: Command, cancelOrFinish?: CancelOrFinish): Promise<void>;
}

export abstract class AbstractViewportSelector extends THREE.EventDispatcher {
    enabled = true;

    private readonly raycaster = new THREE.Raycaster();
    private readonly mouse = new THREE.Vector2();

    private readonly onDownPosition = new THREE.Vector2();
    private readonly onUpPosition = new THREE.Vector2();

    private readonly disposable = new CompositeDisposable();

    constructor(
        private readonly camera: THREE.Camera,
        private readonly domElement: HTMLElement,
        protected readonly db: GeometryDatabase,
        protected readonly signals: EditorSignals
    ) {
        super();

        // @ts-expect-error("Line2 is missing from the typedef")
        this.raycaster.params.Line2 = { threshold: 10 };
        this.raycaster.params.Mesh.threshold = 0;
        // @ts-expect-error("Points is missing from the typedef")
        this.raycaster.params.Points.threshold = 10;
        this.raycaster.layers = visual.VisibleLayers;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerHover = this.onPointerHover.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerHover);
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointerdown', this.onPointerDown)));
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointermove', this.onPointerHover)));
    }

    onPointerDown(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onDownPosition.fromArray(array);

        document.addEventListener('pointerup', this.onPointerUp);
    }

    onPointerHover(event: PointerEvent): void {
        if (!this.enabled) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        const point = new THREE.Vector2();
        point.fromArray(array);
        const intersects = this.getIntersects(point, [...this.db.visibleObjects]);
        this.processHover(intersects);
    }

    onPointerUp(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        const array = this.getMousePosition(this.domElement, event.clientX, event.clientY);
        this.onUpPosition.fromArray(array);

        if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) {
            const intersects = this.getIntersects(this.onUpPosition, [...this.db.visibleObjects]);

            this.processClick(intersects);
        }

        document.removeEventListener('pointerup', this.onPointerUp);
    }

    protected abstract processClick(intersects: THREE.Intersection[]): void;
    protected abstract processHover(intersects: THREE.Intersection[]): void;

    private getMousePosition(dom: HTMLElement, x: number, y: number) {
        const rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        this.mouse.set((point.x * 2) - 1, - (point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(objects, false);
    }

    dispose() {
        this.disposable.dispose();
    }
}

export class ViewportSelector extends AbstractViewportSelector {
    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        private readonly editor: EditorLike,
    ) {
        super(camera, domElement, editor.db, editor.signals);
    }

    protected processClick(intersects: THREE.Intersection[]) {
        const command = new ChangeSelectionCommand(this.editor, intersects);
        this.editor.enqueue(command, 'finish');
    }

    protected processHover(intersects: THREE.Intersection[]) {
        this.editor.selectionInteraction.onHover(intersects);
    }
}
