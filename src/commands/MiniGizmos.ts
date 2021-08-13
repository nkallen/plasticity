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
    push() { this.original = this.currentMagnitude }
    revert() { this.current = this.original }
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
    get value() { return this.state.current }
    set value(m: T) { this.state.original = m }

    private readonly circle: Line2 = new Line2(circleGeometry, this.material.line2);
    private readonly torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.35, 4, 24), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike, private readonly material: GizmoMaterial, readonly state: AbstractValueStateMachine<T>) {
        super(name.split(':')[0], editor);

        this.torus.userData.command = [`gizmo:${name}`, () => { }];
        const helper = new DashedLineMagnitudeHelper();
        const picker = new THREE.Object3D();
        picker.add(this.torus);
        this.setup({ handle: this.circle, picker, helper });
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.revert();
        cb(this.state.current);
    }

    onPointerEnter(intersect: Intersector) {
        this.circle.material = this.material.hover.line2;
    }

    onPointerLeave(intersect: Intersector) {
        this.circle.material = this.material.line2;
    }

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    get shouldLookAtCamera() { return true }

    update(camera: THREE.Camera) {
        super.update(camera);
        if (this.shouldLookAtCamera) this.lookAt(camera.position);
    }
}

export class AngleGizmo extends CircularGizmo<number> {
    constructor(name: string, editor: EditorLike, material?: GizmoMaterial) {
        super(name, editor, material ?? editor.gizmos.default, new MagnitudeStateMachine(0));
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        const angle = info.angle + this.state.original;
        this.state.current = angle;
        cb(this.state.current);
    }
}

const localY = new THREE.Vector3();
const dir = new THREE.Vector3();
const align = new THREE.Vector3();

export abstract class AbstractAxisGizmo extends AbstractGizmo<(mag: number) => void>  {
    readonly tip: THREE.Mesh;
    protected readonly knob: THREE.Mesh;
    protected readonly shaft: THREE.Mesh;
    private readonly material: GizmoMaterial;

    private readonly plane = new THREE.Mesh(planeGeometry, this.editor.gizmos.invisible);

    private readonly startMousePosition = new THREE.Vector3();
    private sign = 1;
    protected originalPosition?= new THREE.Vector3();

    constructor(
        name: string,
        editor: EditorLike,
        info: { tip: THREE.Mesh, knob: THREE.Mesh, shaft: THREE.Mesh, helper?: GizmoHelper, material: GizmoMaterial },
        readonly state: MagnitudeStateMachine
    ) {
        super(name.split(':')[0], editor);

        const { tip, knob, shaft, material, helper } = info;
        this.tip = tip; this.knob = knob; this.shaft = shaft; this.material = material;

        const handle = new THREE.Group();
        handle.add(tip, shaft);

        const picker = new THREE.Group();
        knob.position.copy(tip.position);
        picker.add(knob);

        this.setup({ handle, picker, helper });
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.revert();
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

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.push();
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) throw new Error("invalid precondition");
        this.startMousePosition.copy(planeIntersect.point);
        this.sign = Math.sign(planeIntersect.point.dot(localY.set(0, 1, 0).applyQuaternion(this.worldQuaternion)));

        if (this.originalPosition === undefined) this.originalPosition = new THREE.Vector3().copy(this.position);
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        const dist = planeIntersect.point.sub(this.startMousePosition).dot(localY.set(0, 1, 0).applyQuaternion(this.worldQuaternion));
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
        super.update(camera);

        const { eye, worldPosition, worldQuaternion } = this;

        eye.copy(camera.position).sub(worldPosition).normalize();

        const o = localY.copy(Y).applyQuaternion(worldQuaternion);
        align.copy(eye).cross(o);
        dir.copy(o).cross(align);

        const matrix = new THREE.Matrix4();
        matrix.lookAt(origin, dir, align);
        this.plane.quaternion.setFromRotationMatrix(matrix);
        this.plane.updateMatrixWorld();
        this.plane.position.copy(worldPosition);
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
export class LengthGizmo extends AbstractAxisGizmo {
    constructor(name: string, editor: EditorLike, helper?: GizmoHelper) {
        const materials = editor.gizmos;

        const tip = new THREE.Mesh(boxGeometry, materials.default.mesh);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.default.line2);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        length = Math.max(length, 0);

        const state = new MagnitudeStateMachine(0);
        state.min = 0;
        super(name, editor, { tip, knob, shaft, helper, material: materials.default }, state);
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

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }
}

export abstract class PlanarGizmo<T> extends AbstractGizmo<(value: T) => void> {
    protected denominator = 1;
    get value() { return this.state.current }

    private readonly defaultMaterial = this.editor.gizmos.default;
    protected readonly square = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), (this.material ?? this.defaultMaterial).mesh);
    protected readonly knob = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), this.editor.gizmos.invisible);
    protected readonly plane = new THREE.Mesh(planeGeometry, this.editor.gizmos.invisible);
    protected readonly startMousePosition = new THREE.Vector3();

    constructor(
        name: string,
        editor: EditorLike,
        readonly state: AbstractValueStateMachine<T>,
        protected readonly material?: GizmoMaterial,
        helper?: GizmoHelper
    ) {
        super(name.split(':')[0], editor);

        this.material = material ?? this.editor.gizmos.default;

        this.square.position.set(0.5, 0.5, 0);
        this.knob.position.copy(this.square.position);
        this.knob.userData.command = [`gizmo:${name}`, () => { }];
        const picker = new THREE.Group();
        picker.add(this.knob);

        this.setup({ handle: this.square, picker });
    }

    onInterrupt(cb: (value: T) => void) {
        this.state.revert();
        cb(this.state.current);
    }


    onPointerEnter(intersect: Intersector) {
        const handle = this.handle as THREE.Mesh;
        handle.material = (this.material ?? this.defaultMaterial).hover.mesh;
    }

    onPointerLeave(intersect: Intersector) {
        const handle = this.handle as THREE.Mesh;
        handle.material = (this.material ?? this.defaultMaterial).mesh;
    }

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.state.push();
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
    constructor(name: string, editor: EditorLike, helper?: GizmoHelper) {
        const materials = editor.gizmos;

        const tip = new THREE.Mesh(sphereGeometry, materials.default.mesh);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.default.line2);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);

        const state = new MagnitudeStateMachine(0);
        state.min = 0;
        super(name, editor, { tip, knob, shaft, helper, material: materials.default }, state);
    }

    render(length: number) {
        super.render(length + 1);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
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
        this.element.setAttribute('height', '100%');
        this.element.setAttribute('viewBox', '0 0 1 1');
        this.element.setAttribute('preserveAspectRatio', 'xMinYMin')
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
        this.converted.x = this.aspectRatio * (from.x + 1) / 2;
        this.converted.y = (from.y - 1) / -2;
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

const helperGeometry = new THREE.BufferGeometry();
const points = [];
points.push(new THREE.Vector3(0, -100, 0));
points.push(new THREE.Vector3(0, 100, 0));
helperGeometry.setFromPoints(points);

export class AxisHelper extends THREE.Line {
    constructor(material: THREE.LineBasicMaterial) {
        super(helperGeometry, material);
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