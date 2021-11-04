import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../util/Util";
import { AbstractGizmo, EditorLike, GizmoHelper, Intersector, MovementInfo } from "./AbstractGizmo";
import { GizmoMaterial } from "./GizmoMaterials";

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

class AbstractValueStateMachine<T> {
    private currentMagnitude: T;

    constructor(private originalMagnitude: T, private readonly interruptShouldRevert = true) {
        this.currentMagnitude = originalMagnitude;
    }

    get original() { return this.originalMagnitude }
    set original(magnitude: T) {
        this.originalMagnitude = this.currentMagnitude = magnitude;
    }

    get current() { return this.currentMagnitude }
    set current(magnitude: T) { this.currentMagnitude = magnitude }

    start() { }
    push() { this.original = this.currentMagnitude }
    revert() { this.current = this.original }
    interrupt() { if (this.interruptShouldRevert) this.revert() }
}

export class MagnitudeStateMachine extends AbstractValueStateMachine<number> {
    min = Number.NEGATIVE_INFINITY;
    get current() { return Math.max(super.current, this.min) }
    set current(magnitude: number) { super.current = magnitude }
}

export class VectorStateMachine extends AbstractValueStateMachine<THREE.Vector3> { }

export class QuaternionStateMachine extends AbstractValueStateMachine<THREE.Quaternion> { }

const circleGeometry = new LineGeometry();
circleGeometry.setPositions(CircleGeometry(radius, 64));

export abstract class CircularGizmo<T> extends AbstractGizmo<(value: T) => void> {
    protected readonly hasCommand: boolean = true;
    get value() { return this.state.current }
    set value(m: T) { this.state.original = m }

    protected readonly circle = new Line2(circleGeometry, this.material.line2);
    protected readonly torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.35, 4, 24), this.editor.gizmos.invisible);
    readonly helper? = new DashedLineMagnitudeHelper();

    constructor(private readonly longName: string, editor: EditorLike, private readonly material: GizmoMaterial, readonly state: AbstractValueStateMachine<T>) {
        super(longName.split(':')[0], editor);
    }

    protected setup() {
        if (this.hasCommand) this.torus.userData.command = [`gizmo:${this.longName}`, () => { }];
        this.handle.add(this.circle);
        this.picker.add(this.torus);
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.interrupt();
        cb(this.state.current);
    }

    onPointerDown(cb: (n: T) => void, intersect: Intersector, info: MovementInfo) {
        this.state.start();
    }

    onPointerEnter(intersect: Intersector) {
        this.circle.material = this.material.hover.line2;
    }

    onPointerLeave(intersect: Intersector) {
        this.circle.material = this.material.line2;
    }

    onPointerUp(cb: (n: T) => void, intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    get shouldLookAtCamera() { return true }

    update(camera: THREE.Camera) {
        super.update(camera);
        if (this.shouldLookAtCamera) this.lookAt(camera.position);
    }
}

export class AngleGizmo extends CircularGizmo<number> {
    private _camera!: THREE.Camera;
    get camera() { return this._camera }

    constructor(name: string, editor: EditorLike, material?: GizmoMaterial) {
        super(name, editor, material ?? editor.gizmos.white, new MagnitudeStateMachine(0));
        this.setup();
    }

    onPointerDown(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        const angle = info.angle + this.state.original;
        this.state.current = angle;
        this._camera = info.viewport.camera;
        cb(this.state.current);
    }

    onKeyPress(cb: (angle: number) => void, text: string) {
        const angle = THREE.MathUtils.degToRad(Number(text));
        this.state.current = angle;
        cb(angle);
    }
}

export abstract class AbstractAxisGizmo extends AbstractGizmo<(mag: number) => void>  {
    abstract readonly tip: THREE.Mesh;
    protected abstract readonly knob: THREE.Mesh;
    protected abstract readonly shaft: THREE.Mesh;
    protected abstract readonly material: GizmoMaterial;
    protected abstract readonly state: MagnitudeStateMachine;
    protected readonly hasCommand: boolean = true;

    private readonly plane = new THREE.Mesh(planeGeometry, this.editor.gizmos.invisible);

    private readonly startMousePosition = new THREE.Vector3();
    private sign = 1;
    protected originalPosition?= new THREE.Vector3();

    constructor(
        private readonly longName: string,
        editor: EditorLike,
    ) {
        super(longName.split(':')[0], editor);
    }

    protected setup() {
        if (this.hasCommand) this.knob.userData.command = [`gizmo:${this.longName}`, () => { }];
        this.tip.position.set(0, 1, 0);
        this.knob.position.copy(this.tip.position);
        this.render(this.state.current);

        this.handle.add(this.tip, this.shaft);
        this.picker.add(this.knob);
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.interrupt();
        cb(this.state.current);
    }

    onPointerEnter(intersect: Intersector) {
        this.shaft.material = this.material.hover.line2;
        this.tip.material = this.material.hover.mesh;
    }

    onPointerLeave(intersect: Intersector) {
        this.shaft.material = this.material.line2;
        this.tip.material = this.material.mesh;
    }

    onPointerUp(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    onPointerDown(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) return;

        this.startMousePosition.copy(planeIntersect.point);
        this.sign = Math.sign(planeIntersect.point.dot(this.localY.set(0, 1, 0).applyQuaternion(this.worldQuaternion)));
        if (this.sign === 0) this.sign = 1;

        if (this.originalPosition === undefined) this.originalPosition = this.position.clone();
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

    get value() { return this.state.current }
    set value(mag: number) {
        this.state.original = mag;
        this.render(this.state.current)
    }

    render(length: number) {
        this.shaft.scale.y = length;
        this.tip.position.set(0, length, 0);
        this.knob.position.copy(this.tip.position);
    }

    private localY = new THREE.Vector3();
    private dir = new THREE.Vector3();
    private align = new THREE.Vector3();
    update(camera: THREE.Camera) {
        super.update(camera);

        const { eye, worldPosition, worldQuaternion, plane, localY, align, dir } = this;

        eye.copy(camera.position).sub(worldPosition).normalize();

        const o = localY.copy(Y).applyQuaternion(worldQuaternion);
        align.copy(eye).cross(o);
        dir.copy(o).cross(align);

        const matrix = new THREE.Matrix4();
        matrix.lookAt(origin, dir, align);
        plane.quaternion.setFromRotationMatrix(matrix);
        plane.position.copy(worldPosition);
        plane.updateMatrixWorld();
    }
}

const origin = new THREE.Vector3();

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
export class LengthGizmo extends AbstractAxisGizmo { // DO NOT SUBCLASS or the abstract fields won't work
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(boxGeometry, this.editor.gizmos.default.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.editor.gizmos.default.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    protected material = this.editor.gizmos.default;

    constructor(name: string, editor: EditorLike) {
        super(name, editor);
        this.state.min = 0;
        this.setup();
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + sign * dist
    }
}

export abstract class PlanarGizmo<T> extends AbstractGizmo<(value: T) => void> {
    protected denominator = 1;
    abstract readonly state: AbstractValueStateMachine<T>;
    get value() { return this.state.current }

    protected readonly square = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), this.material.mesh);
    protected readonly knob = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), this.editor.gizmos.invisible);
    protected readonly plane = new THREE.Mesh(planeGeometry, this.editor.gizmos.invisible);
    protected readonly startMousePosition = new THREE.Vector3();

    constructor(
        name: string,
        editor: EditorLike,
        private readonly material: GizmoMaterial,
    ) {
        super(name.split(':')[0], editor);

        this.square.position.set(0.5, 0.5, 0);
        this.knob.position.copy(this.square.position);
        this.knob.userData.command = [`gizmo:${name}`, () => { }];
        this.picker.add(this.knob)
        this.handle.add(this.square);
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.interrupt();
        cb(this.state.current);
    }

    onPointerEnter(intersect: Intersector) {
        this.square.material = this.material.hover.mesh;
    }

    onPointerLeave(intersect: Intersector) {
        this.square.material = this.material.mesh;
    }

    onPointerUp(cb: (t: T) => void, intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    onPointerDown(cb: (t: T) => void, intersect: Intersector, info: MovementInfo) {
        this.updatePlane();
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) throw new Error("invalid precondition");
        this.state.start();
        this.startMousePosition.copy(planeIntersect.point);
        this.denominator = this.startMousePosition.distanceTo(this.worldPosition);
        if (this.denominator === 0) this.denominator = 1;
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
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.editor.gizmos.default.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.editor.gizmos.default.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    protected material = this.editor.gizmos.default;

    constructor(name: string, editor: EditorLike) {
        super(name, editor);
        this.setup();
    }

    render(length: number) {
        super.render(length + 1);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }
}

// This gizmo behaves somewhere between a scale and a move gizmo
export abstract class AbstractAxialScaleGizmo extends AbstractAxisGizmo {
    readonly helper: GizmoHelper = new DashedLineMagnitudeHelper();
    protected readonly handleLength: number = 1;
    private denominator = 1;

    constructor(name: string, editor: EditorLike, protected readonly material: GizmoMaterial) {
        super(name, editor);
    }

    get value() { return this.state.current }
    set value(mag: number) {
        this.state.original = mag;
        this.render(this.state.current)
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.interrupt();
        cb(this.state.current);
    }

    onPointerUp(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    onPointerDown(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        const { pointStart2d, center2d } = info;
        this.denominator = pointStart2d.distanceTo(center2d);
        this.state.start();
    }

    private readonly end2center = new THREE.Vector2();
    private readonly start2center = new THREE.Vector2();
    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        const { pointEnd2d, center2d, pointStart2d } = info;
        const { end2center, start2center } = this;

        end2center.copy(pointEnd2d).sub(center2d);
        start2center.copy(pointStart2d).sub(center2d);
        const sign = Math.sign(end2center.dot(start2center));

        const magnitude = this.accumulate(this.state.original, end2center.length(), this.denominator, sign);
        this.state.current = magnitude;
        this.render(this.state.current);
        cb(this.state.current);
    }

    render(length: number) {
        this.shaft.scale.y = length + this.handleLength;
        this.tip.position.set(0, length + this.handleLength, 0);
        this.knob.position.copy(this.tip.position);
    }

    protected accumulate(original: number, dist: number, denom: number, sign: number = 1): number {
        if (original === 0) return sign > 0 ? Math.max(0, dist - denom) : -dist;
        else return sign * (original + ((dist - denom) * original) / denom);
    }
}

// "Helpers" appear when the user starts interacting with the gizmo (after click)
// For values that grow/shink a dashed line works well, and for things that move
// along axes, a line appearing showing the direction is nice.
export class DashedLineMagnitudeHelper implements GizmoHelper {
    private readonly element: SVGSVGElement;
    private readonly line: SVGLineElement;
    private parentElement?: HTMLElement;
    private state: 'none' | 'started' = 'none';

    constructor() {
        this.element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.element.setAttribute('viewBox', '-1 -1 2 2');
        this.element.setAttribute('preserveAspectRatio', 'none')
        this.element.classList.add('gizmo-helper');

        this.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.element.appendChild(this.line);
    }

    onStart(parentElement: HTMLElement, position: THREE.Vector2) {
        switch (this.state) {
            case 'none':
                parentElement.appendChild(this.element);
                this.parentElement = parentElement;

                const converted = this.toSVGCoordinates(position);

                this.line.setAttribute('x1', String(converted.x));
                this.line.setAttribute('y1', String(converted.y));
                this.line.setAttribute('x2', String(converted.x));
                this.line.setAttribute('y2', String(converted.y));

                this.state = 'started';
                break;
            default: throw new Error("invalid state");
        }
    }

    onMove(position: THREE.Vector2) {
        switch (this.state) {
            case 'started':
                const converted = this.toSVGCoordinates(position);
                this.line.setAttribute('x2', String(converted.x));
                this.line.setAttribute('y2', String(converted.y));
                break;
            default: throw new Error("invalid state");
        }
    }

    get aspectRatio() {
        const box = this.parentElement!.parentElement!;
        const aspectRatio = box.offsetWidth / box.offsetHeight;
        return aspectRatio;
    }

    private readonly converted = new THREE.Vector2();
    toSVGCoordinates(from: THREE.Vector2): THREE.Vector2 {
        this.converted.x = from.x;
        this.converted.y = -from.y;
        return this.converted;
    }

    onEnd() {
        switch (this.state) {
            case 'started':
                this.parentElement!.removeChild(this.element);
                this.state = 'none';
        }
    }
}

const axisGeometry = new THREE.BufferGeometry();
const points = [];
points.push(new THREE.Vector3(0, -100_000, 0));
points.push(new THREE.Vector3(0, 100_000, 0));
axisGeometry.setFromPoints(points);

export class AxisHelper extends THREE.Line implements GizmoHelper {
    constructor(material: THREE.LineBasicMaterial) {
        super(axisGeometry, material);
        this.visible = false;
    }
    onStart(parentElement: HTMLElement, position: THREE.Vector2): void {
        this.visible = true;
    }
    onMove(position: THREE.Vector2): void { }
    onEnd(): void {
        this.visible = false;
    }
}

export class CompositeHelper extends THREE.Object3D implements GizmoHelper {
    constructor(private readonly helpers: GizmoHelper[]) {
        super();
        for (const helper of helpers) {
            if (helper instanceof THREE.Object3D) this.add(helper);
        }
    }

    onStart(parentElement: HTMLElement, position: THREE.Vector2): void {
        for (const helper of this.helpers) {
            helper.onStart(parentElement, position);
        }
    }

    onMove(position: THREE.Vector2): void {
        for (const helper of this.helpers) {
            helper.onMove(position);
        }
    }

    onEnd(): void {
        for (const helper of this.helpers) {
            helper.onEnd();
        }
    }
}