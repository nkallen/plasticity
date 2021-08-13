import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxisGizmo, arrowGeometry, AxisHelper, CircularGizmo, lineGeometry, MagnitudeStateMachine, PlanarGizmo, VectorStateMachine } from "../MiniGizmos";
import { MoveParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class MoveGizmo extends CompositeGizmo<MoveParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = { tip: this.materials.red, shaft: this.materials.lineRed };
    private readonly green = { tip: this.materials.green, shaft: this.materials.lineGreen };
    private readonly blue = { tip: this.materials.blue, shaft: this.materials.lineBlue };
    private readonly yellow = this.materials.yellowTransparent;
    private readonly magenta = this.materials.magentaTransparent;
    private readonly cyan = this.materials.cyanTransparent;
    private readonly x = new MoveAxisGizmo("move:x", this.editor, this.red);
    private readonly y = new MoveAxisGizmo("move:y", this.editor, this.green);
    private readonly z = new MoveAxisGizmo("move:z", this.editor, this.blue);
    private readonly xy = new PlanarMoveGizmo("move:xy", this.editor, this.yellow);
    private readonly yz = new PlanarMoveGizmo("move:yz", this.editor, this.cyan);
    private readonly xz = new PlanarMoveGizmo("move:xz", this.editor, this.magenta);
    private readonly screen = new CircleMoveGizmo("move:screen", this.editor);

    prepare() {
        const { x, y, z, xy, yz, xz, screen } = this;
        for (const o of [x, y, z, xy, yz, xz]) o.scale.setScalar(0.8);
        screen.scale.setScalar(0.25);
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
    constructor(name: string, editor: EditorLike, material?: THREE.MeshBasicMaterial) {
        const state = new VectorStateMachine(new THREE.Vector3());
        super(name, editor, state, material);
    }

    onPointerMove(cb: (value: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo): void {
        const { plane, startMousePosition, state } = this;

        const planeIntersect = intersect(plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        const delta = planeIntersect.point.sub(startMousePosition).add(state.original);

        this.state.current = delta;
        cb(delta);
    }
}

export class CircleMoveGizmo extends CircularGizmo<THREE.Vector3> {
    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.line, new VectorStateMachine(new THREE.Vector3()));
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        this.state.start();
    }

    onPointerMove(cb: (delta: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo): void {
        const delta = info.pointEnd3d.sub(info.pointStart3d).add(this.state.original);
        this.state.current = delta;
        cb(delta);
    }
}

export class MoveAxisGizmo extends AbstractAxisGizmo {
    constructor(name: string, editor: EditorLike, material?: { tip: THREE.MeshBasicMaterial, shaft: LineMaterial }) {
        const materials = editor.gizmos;
        material ??= { tip: materials.yellow, shaft: materials.lineYellow }
        const tip = new THREE.Mesh(arrowGeometry, material.tip);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, material.shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        // @ts-ignore-error("it only considers color, so it's ok")
        const helper = new AxisHelper(material.tip);

        super(name, editor, { tip, knob, shaft, helper }, new MagnitudeStateMachine(0));

        this.add(helper);
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

const localY = new THREE.Vector3

const AXIS_HIDE_TRESHOLD = 0.99;