import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CircleGeometry } from "../util/Util";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "./AbstractGizmo";

const radius = 1;
const zeroVector = new THREE.Vector3();

abstract class CircularGizmo extends AbstractGizmo<(angle: number) => void> {
    protected state: MagnitudeStateMachine;
    get magnitude() { return this.state.current }
    set magnitude(m: number) { this.state.original = m }

    constructor(name: string, editor: EditorLike, state: MagnitudeStateMachine) {
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

    onInterrupt(cb: (radius: number) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.stop();
    }

    update(camera: THREE.Camera) {
        // super.update(camera);
        this.lookAt(camera.position);
    }
}

class AbstractStateMachine<T> {
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

class MagnitudeStateMachine extends AbstractStateMachine<number> {
    min = Number.NEGATIVE_INFINITY;
    get current() { return Math.max(super.current, this.min) }
    set current(magnitude: number) { super.current = magnitude }
}

class VectorStateMachine extends AbstractStateMachine<THREE.Vector3> { }

export class AngleGizmo extends CircularGizmo {
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

export class CircleMagnitudeGizmo extends CircularGizmo {
    private denominator = 1;

    constructor(name: string, editor: EditorLike) {
        super(name, editor, new MagnitudeStateMachine(1));
        this.relativeScale.setScalar(0.7);
        this.render(this.state.current);
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        const { pointStart2d, center2d } = info;
        this.denominator = pointStart2d.distanceTo(center2d);
        this.state.start();
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const { pointEnd2d, center2d } = info;

        const magnitude = this.state.original * pointEnd2d.distanceTo(center2d) / this.denominator!;
        this.state.current = magnitude;
        this.render(this.state.current);
        cb(this.state.current);
    }

    render(magnitude: number) {
        this.scale.setScalar(magnitude);
        this.scale.multiply(this.relativeScale);
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

export class ScaleAxisGizmo extends AbstractAxisGizmo {
    constructor(name: string, editor: EditorLike, material?: { tip: THREE.MeshBasicMaterial, shaft: LineMaterial }) {
        const materials = editor.gizmos;
        material ??= { tip: materials.yellow, shaft: materials.lineYellow }
        const tip = new THREE.Mesh(boxGeometry, material.tip);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, material.shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        super(name, editor, { tip, knob, shaft }, new MagnitudeStateMachine(1));
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + sign * dist
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

        super(name, editor, { tip, knob, shaft }, new MagnitudeStateMachine(0));
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        this.scaleIndependentOfZoom(camera);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }
}

const arrowLength = 0.1;
const arrowGeometry = new THREE.CylinderGeometry(0, 0.03, arrowLength, 12, 1, false);
const lineGeometry = new LineGeometry();
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

export class PlanarMagnitudeGizmo extends AbstractGizmo<(magnitude: number) => void> {
    private denominator: number;
    private state: MagnitudeStateMachine;
    get magnitude() { return this.state.current }

    protected readonly knob: THREE.Mesh;
    private plane: THREE.Mesh;
    private readonly startMousePosition: THREE.Vector3;
    private readonly worldPosition: THREE.Vector3;

    constructor(name: string, editor: EditorLike, material?: THREE.MeshBasicMaterial) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;
        material ??= materials.yellow;

        const handle = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), material);
        handle.position.set(0.3, 0.3, 0);

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
        this.state = new MagnitudeStateMachine(1);
    }

    onInterrupt(cb: (magnitude: number) => void) {
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
        this.state.start();
        this.startMousePosition.copy(planeIntersect.point);
        this.denominator = this.startMousePosition.distanceTo(this.worldPosition);
    }

    onPointerMove(cb: (magnitude: number) => void, intersect: Intersector, info: MovementInfo): void {
        const { plane, denominator, state } = this;

        const planeIntersect = intersect(plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        let magnitude = planeIntersect.point.sub(this.worldPosition).length();
        magnitude *= state.original;
        magnitude /= denominator;

        this.state.current = magnitude;
        this.render(magnitude);
        cb(magnitude);
    }

    update(camera: THREE.Camera) {
        const { plane, worldPosition } = this;
        this.getWorldQuaternion(plane.quaternion);
        this.getWorldPosition(worldPosition);
        this.plane.position.copy(worldPosition);
        this.plane.updateMatrixWorld();
        super.update(camera);
    }

    render(magnitude: number) {
        this.handle.position.set(0.3 * magnitude, 0.3 * magnitude, 0);
        this.knob.position.copy(this.handle.position);
    }
}

const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);

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

