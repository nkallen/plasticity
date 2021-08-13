import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { GizmoMaterial } from "../GizmoMaterials";
import { AbstractAxisGizmo, arrowGeometry, AxisHelper, CircularGizmo, DistanceGizmo, lineGeometry, MagnitudeStateMachine, PlanarGizmo, VectorStateMachine } from "../MiniGizmos";
import { MoveParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class MoveGizmo extends CompositeGizmo<MoveParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.red;
    private readonly green = this.materials.green;
    private readonly blue = this.materials.blue;
    private readonly yellow = this.materials.yellow;
    private readonly cyan = this.materials.cyan;
    private readonly magenta = this.materials.magenta;
    private readonly x = new MoveAxisGizmo("move:x", this.editor, this.red);
    private readonly y = new MoveAxisGizmo("move:y", this.editor, this.green);
    private readonly z = new MoveAxisGizmo("move:z", this.editor, this.blue);
    private readonly xy = new PlanarMoveGizmo("move:xy", this.editor, this.yellow);
    private readonly yz = new PlanarMoveGizmo("move:yz", this.editor, this.cyan);
    private readonly xz = new PlanarMoveGizmo("move:xz", this.editor, this.magenta);
    private readonly screen = new CircleMoveGizmo("move:screen", this.editor);

    prepare() {
        const { x, y, z, xy, yz, xz, screen } = this;
        for (const o of [x, y, z, xy, yz, xz]) o.relativeScale.setScalar(0.8);
        screen.relativeScale.setScalar(0.25);
    }

    execute(cb: (params: MoveParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, screen, params } = this;
        const originalPosition = this.position.clone();

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);

        this.add(x, y, z, xy, yz, xz, screen);

        const set = () => {
            const delta = new THREE.Vector3(x.magnitude, y.magnitude, z.magnitude);
            delta.add(screen.value);
            delta.add(xy.value);
            delta.add(yz.value);
            delta.add(xz.value);
            params.move = delta;
            this.position.copy(originalPosition).add(delta);
        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);
        this.addGizmo(xy, set);
        this.addGizmo(yz, set);
        this.addGizmo(xz, set);
        this.addGizmo(screen, set);

        return super.execute(cb, finishFast);
    }
}

export class PlanarMoveGizmo extends PlanarGizmo<THREE.Vector3> {
    readonly state = new VectorStateMachine(new THREE.Vector3());

    onPointerMove(cb: (value: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo): void {
        const { plane, startMousePosition, state } = this;

        const planeIntersect = intersect(plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        const delta = planeIntersect.point.clone().sub(startMousePosition).add(state.original);

        this.state.current = delta;
        cb(delta);
    }
}

export class CircleMoveGizmo extends CircularGizmo<THREE.Vector3> {
    private readonly delta = new THREE.Vector3();
    helper = undefined;

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.white, new VectorStateMachine(new THREE.Vector3()));
    }

    onPointerMove(cb: (delta: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo): void {
        this.delta.copy(info.pointEnd3d).sub(info.pointStart3d).add(this.state.original);
        this.state.current = this.delta.clone();
        cb(this.state.current);
    }
}

export class MoveAxisGizmo extends AbstractAxisGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip = new THREE.Mesh(arrowGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    readonly helper = new AxisHelper(this.material.line);

    constructor(name: string, editor: EditorLike, protected readonly material: GizmoMaterial) {
        super(name, editor);
        this.setup();
        this.add(this.helper);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }

    render(length: number) { }

    update(camera: THREE.Camera) {
        super.update(camera);

        const { eye, worldQuaternion } = this;

        // hide objects facing the camera
        this.visible = true;
        const dot = localY.copy(Y).applyQuaternion(worldQuaternion).dot(eye);
        if (Math.abs(dot) > AXIS_HIDE_TRESHOLD) {
            this.visible = false;
        }
    }
}

const localY = new THREE.Vector3();

const AXIS_HIDE_TRESHOLD = 0.99;