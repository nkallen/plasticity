import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../util/Util";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "./AbstractGizmo";

/**
 * In this file are a collection of "mini" gizmos that can be used alone or composed into a more complex gizmo.
 * Gizmos rely on two state machines: 1), the state machine that is part of AbstractGizmo, which handles user
 * interaction dealing with mousedown, mousemove, mouseup, etc. and 2) the AbstractValueStateMachine, which keeps
 * track of the current value of the widget (which could be scalar or vector), and allows rolling back to
 * previous values.
 * 
 * At the moment there are Circular gizmos (angles, movement in screen space), Axial gizmos (move/scale
 * in x/y/z, fillet and push/pull handles), and planar gizmos (move/scale in the XY plane, etc.)
 * 
 * This file only has a few concrete gizmos (Angle, Length, Magnitude) but it exports abstract classes for
 * circular, axial, and planar gizmos to subclass.
 */

const radius = 1;
 const zeroVector = new THREE.Vector3();
 
class AbstractValueStateMachine<T> {
    private currentMagnitude: T;

    constructor(private originalMagnitude: T) {
        this.currentMagnitude = originalMagnitude;
    }

    get original() { return this.originalMagnitude }
    set original(magnitude: T) {
        this.originalMagnitude = this.currentMagnitude = magnitude;
    }

    get current() { return this.currentMagnitude }
    set current(magnitude: T) { this.currentMagnitude = magnitude }

    start() { }
    stop() { this.original = this.currentMagnitude }
    revert() { this.current = this.original }
}

export class MagnitudeStateMachine extends AbstractValueStateMachine<number> {
    min = Number.NEGATIVE_INFINITY;
    get current() { return Math.max(super.current, this.min) }
    set current(magnitude: number) { super.current = magnitude }
}

export class VectorStateMachine extends AbstractValueStateMachine<THREE.Vector3> { }

export abstract class CircularGizmo<T> extends AbstractGizmo<(value: T) => void> {
    protected state: AbstractValueStateMachine<T>;
    get value() { return this.state.current }
    set value(m: T) { this.state.original = m }

    constructor(name: string, editor: EditorLike, state: AbstractValueStateMachine<T>) {
        const [gizmoName,] = name.split(':');

        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const geometry = new LineGeometry();
        geometry.setPositions(CircleGeometry(radius, 64));
        const circle = new Line2(geometry, materials.line);
        handle.add(circle);

        const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
        torus.userData.command = [`gizmo:${name}`, () => { }];
        picker.add(torus);

        super(gizmoName, editor, { handle, picker });

        this.state = state;
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.stop();
    }

    update(camera: THREE.Camera) {
        this.lookAt(camera.position);
    }
}

export class AngleGizmo extends CircularGizmo<number> {
    constructor(name: string, editor: EditorLike) {
        super(name, editor, new MagnitudeStateMachine(0));
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        const angle = info.angle + this.state.original;
        this.state.current = angle;
        cb(this.state.current);
    }
}

export abstract class AbstractAxisGizmo extends AbstractGizmo<(mag: number) => void>  {
    state: MagnitudeStateMachine;

    readonly tip: THREE.Mesh;
    protected readonly knob: THREE.Mesh;
    protected readonly shaft: THREE.Mesh;

    private readonly plane: THREE.Mesh;
    protected worldQuaternion: THREE.Quaternion;
    private worldPosition: THREE.Vector3;

    private readonly startMousePosition: THREE.Vector3;
    private sign: number;
    private readonly localY: THREE.Vector3;
    protected originalPosition?: THREE.Vector3;

    constructor(name: string, editor: EditorLike, info: { tip: THREE.Mesh, knob: THREE.Mesh, shaft: THREE.Mesh }, state: MagnitudeStateMachine) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;

        const plane = new THREE.Mesh(planeGeometry, materials.yellow);

        const { tip, knob, shaft } = info;

        const handle = new THREE.Group();
        handle.add(tip, shaft);

        const picker = new THREE.Group();
        knob.position.copy(tip.position);
        picker.add(knob);

        super(gizmoName, editor, { handle, picker });

        this.shaft = shaft;
        this.tip = tip;
        this.knob = knob;
        this.plane = plane;

        this.startMousePosition = new THREE.Vector3();
        this.sign = 1;

        this.worldQuaternion = new THREE.Quaternion();
        this.worldPosition = new THREE.Vector3();
        this.localY = new THREE.Vector3();

        this.state = state;
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerHover(intersect: Intersector): void { }

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.stop();
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) throw new Error("invalid precondition");
        this.startMousePosition.copy(planeIntersect.point);
        this.sign = Math.sign(planeIntersect.point.dot(this.localY.set(0, 1, 0).applyQuaternion(this.worldQuaternion)));

        if (this.originalPosition === undefined) this.originalPosition = new THREE.Vector3().copy(this.position);
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        const dist = planeIntersect.point.sub(this.startMousePosition).dot(this.localY.set(0, 1, 0).applyQuaternion(this.worldQuaternion));
        let length = this.accumulate(this.state.original, this.sign, dist);
        this.state.current = length;
        this.render(this.state.current);
        cb(this.state.current);
    }

    protected abstract accumulate(original: number, sign: number, dist: number): number;

    get magnitude() { return this.state.current }
    set magnitude(mag: number) {
        this.state.original = mag;
        this.render(this.state.current)
    }

    render(length: number) {
        this.shaft.scale.y = length;
        this.tip.position.set(0, length, 0);
        this.knob.position.copy(this.tip.position);
    }

    update(camera: THREE.Camera) {
        const { worldQuaternion, worldPosition } = this;
        this.getWorldQuaternion(worldQuaternion);
        this.getWorldPosition(worldPosition);

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(worldPosition).normalize();
        const align = new THREE.Vector3();
        const dir = new THREE.Vector3();

        const o = Y.clone().applyQuaternion(worldQuaternion);
        align.copy(eye).cross(o);
        dir.copy(o).cross(align);

        const matrix = new THREE.Matrix4();
        matrix.lookAt(new THREE.Vector3(), dir, align);
        this.plane.quaternion.setFromRotationMatrix(matrix);
        this.plane.updateMatrixWorld();
        this.plane.position.copy(worldPosition);
    }
}

const arrowLength = 0.2;
export const arrowGeometry = new THREE.CylinderGeometry(0, 0.1, arrowLength, 12, 1, false);
export const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);

// Both Length and Magnitude gizmos are linear gizmos. However, Length represents
// a world-space length, and thus shouldn't rescale with view. Whereas the magnitude
// gizmo is just a scalar quantity and SHOULD scale with view.
export class LengthGizmo extends AbstractAxisGizmo {
    constructor(name: string, editor: EditorLike) {
        const materials = editor.gizmos;

        const tip = new THREE.Mesh(boxGeometry, materials.yellow);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.lineYellow);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        length = Math.max(length, 0);

        const state = new MagnitudeStateMachine(0);
        state.min = 0;
        super(name, editor, { tip, knob, shaft }, state);
        this.render(this.state.current);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + sign * dist
    }
}

export class MagnitudeGizmo extends LengthGizmo {
    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }
}

export abstract class PlanarGizmo<T> extends AbstractGizmo<(value: T) => void> {
    protected denominator: number;
    protected state: AbstractValueStateMachine<T>;
    get value() { return this.state.current }

    protected readonly knob: THREE.Mesh;
    protected plane: THREE.Mesh;
    protected readonly startMousePosition: THREE.Vector3;
    protected readonly worldPosition: THREE.Vector3;

    constructor(name: string, editor: EditorLike, state: AbstractValueStateMachine<T>, material?: THREE.MeshBasicMaterial) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;
        material ??= materials.yellow;

        const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), material);
        handle.position.set(0.5, 0.5, 0);

        const knob = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), materials.invisible);
        knob.position.copy(handle.position);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        const picker = new THREE.Group();
        picker.add(knob);

        super(gizmoName, editor, { handle, picker });

        this.knob = knob;
        this.plane = new THREE.Mesh(planeGeometry, materials.invisible);
        this.startMousePosition = new THREE.Vector3();
        this.worldPosition = new THREE.Vector3();
        this.denominator = 1;
        this.state = state;
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.stop();
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        this.updatePlane();
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) throw new Error("invalid precondition");
        this.state.start();
        this.startMousePosition.copy(planeIntersect.point);
        this.denominator = this.startMousePosition.distanceTo(this.worldPosition);
    }

    private updatePlane() {
        const { plane, worldPosition } = this;
        this.getWorldQuaternion(plane.quaternion);
        this.getWorldPosition(worldPosition);
        this.plane.position.copy(worldPosition);
        this.plane.updateMatrixWorld();
    }

    render(value: T) { }
}

export const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
export const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);

// The distance gizmo is a pin with a ball on top for moving objects. It's initial length is always 1,
// unlike the length gizmo, whose length is equal to the value it emits.
export class DistanceGizmo extends AbstractAxisGizmo {
    constantLength: boolean;

    constructor(name: string, editor: EditorLike) {
        const materials = editor.gizmos;

        const tip = new THREE.Mesh(sphereGeometry, materials.yellow);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.lineYellow);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        const state = new MagnitudeStateMachine(0);
        state.min = 0;
        super(name, editor, { tip, knob, shaft }, state);

        this.constantLength = false;
    }

    render(length: number) {
        if (this.constantLength) {
            this.position.set(0, length, 0).applyQuaternion(this.worldQuaternion).add(this.originalPosition ?? zeroVector);
        } else {
            super.render(length + 1);
        }
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + sign * dist
    }
}

