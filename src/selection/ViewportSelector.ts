import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';
import { SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper.js';
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

type State = { tag: 'none' } | { tag: 'down' } | { tag: 'box' }

export abstract class AbstractViewportSelector extends THREE.EventDispatcher {
    enabled = true;

    private readonly raycaster = new THREE.Raycaster();

    private readonly mouse = new THREE.Vector2(); // normalized device coordinates
    private readonly onDownPosition = new THREE.Vector2(); // screen coordinates
    private readonly currentPosition = new THREE.Vector2(); // screen coordinates

    private readonly selectionBox = new SelectionBox(this.camera, new THREE.Scene());
    private readonly selectionHelper = new SelectionHelper(this.selectionBox, undefined, 'select-box');

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
        this.onPointerMove = this.onPointerMove.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointerdown', this.onPointerDown)));
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointermove', this.onPointerMove)));
    }

    onPointerDown(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        getMousePosition(this.domElement, event.clientX, event.clientY, this.onDownPosition);

        document.addEventListener('pointerup', this.onPointerUp);
        this.dispatchEvent({ type: 'start' });
    }

    onPointerMove(event: PointerEvent): void {
        if (!this.enabled) return;

        getMousePosition(this.domElement, event.clientX, event.clientY, this.currentPosition);
        const intersects = this.getIntersects(this.currentPosition, [...this.db.visibleObjects]);
        this.processHover(intersects);
    }

    onPointerUp(event: PointerEvent): void {
        if (!this.enabled) return;
        if (event.button !== 0) return;

        getMousePosition(this.domElement, event.clientX, event.clientY, this.currentPosition);

        if (this.onDownPosition.distanceTo(this.currentPosition) === 0) {
            const intersects = this.getIntersects(this.currentPosition, [...this.db.visibleObjects]);

            this.processClick(intersects);
        }

        document.removeEventListener('pointerup', this.onPointerUp);
        this.dispatchEvent({ type: 'end' });
    }

    protected abstract processClick(intersects: THREE.Intersection[]): void;
    protected abstract processHover(intersects: THREE.Intersection[]): void;

    private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        screen2normalized(point, this.mouse);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(objects, false);
    }

    dispose() {
        this.disposable.dispose();
    }
}

function screen2normalized(from: THREE.Vector2, to: THREE.Vector2) {
    to.set((from.x * 2) - 1, - (from.y * 2) + 1);
}


function getMousePosition(dom: HTMLElement, x: number, y: number, to: THREE.Vector2) {
    const rect = dom.getBoundingClientRect();
    to.set((x - rect.left) / rect.width, (y - rect.top) / rect.height);
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
