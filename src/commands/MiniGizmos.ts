import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../util/Util";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "./AbstractGizmo";

const radius = 1;

export class AngleGizmo extends AbstractGizmo<(angle: number) => void> {
    private readonly circle: THREE.Mesh;
    private readonly torus: THREE.Mesh;

    constructor(name: string, editor: EditorLike) {
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

        this.circle = circle;
        this.torus = torus;
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerDown(intersect: Intersector, info: MovementInfo) { }
    onPointerUp(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        const angle = info.angle;
        cb(angle);
    }

    update(camera: THREE.Camera) {
        // super.update(camera);

        // this.circle.lookAt(camera.position);
        // this.torus.lookAt(camera.position);
        this.lookAt(camera.position);
    }
}

const arrowGeometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 12, 1, false);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);

export class LengthGizmo extends AbstractGizmo<(distance: number) => void> {
    private readonly tip: THREE.Mesh;
    private readonly knob: THREE.Mesh;
    private readonly shaft: THREE.Mesh;
    private readonly plane: THREE.Mesh;

    constructor(name: string, editor: EditorLike) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const plane = new THREE.Mesh(planeGeometry, materials.invisible);

        const tip = new THREE.Mesh(arrowGeometry, materials.yellow);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.lineYellow);
        handle.add(tip, shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);
        picker.add(knob);

        super(gizmoName, editor, { handle, picker });

        this.shaft = shaft;
        this.tip = tip;
        this.knob = knob;
        this.plane = plane;
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerDown(intersect: Intersector, info: MovementInfo) { }
    onPointerUp(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect == null) return; // this only happens when the user is dragging through different viewports.

        const length = planeIntersect.point.distanceTo(this.position);
        this.render(length);
        cb(Math.abs(length - 1));
    }

    set length(length: number) {
        this.render(length);
    }

    render(length: number) {
        this.shaft.scale.y = length;
        this.tip.position.set(0, length, 0);
        this.knob.position.copy(this.tip.position);
    }

    update(camera: THREE.Camera) {
        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();
        const align = new THREE.Vector3();
        const dir = new THREE.Vector3();

        const o = Y.clone().applyQuaternion(this.quaternion);
        align.copy(eye).cross(o);
        dir.copy(o).cross(align);

        const matrix = new THREE.Matrix4();
        matrix.lookAt(new THREE.Vector3(), dir, align);
        this.plane.quaternion.setFromRotationMatrix(matrix);
        this.plane.updateMatrixWorld();
        this.plane.position.copy(this.position);
    }
}

const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);

// The distance gizmo is a pin with a ball on top for moving objects. It's initial length is always 1,
// unlike the length gizmo, whose length is equal to the value it emits.
export class DistanceGizmo extends AbstractGizmo<(distance: number) => void> {
    readonly tip: THREE.Mesh;
    private readonly knob: THREE.Mesh;
    private readonly shaft: THREE.Mesh;
    private readonly plane: THREE.Mesh;

    private worldQuaternion: THREE.Quaternion;
    private worldPosition: THREE.Vector3;

    private readonly startPosition: THREE.Vector3;

    constructor(name: string, editor: EditorLike) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const plane = new THREE.Mesh(planeGeometry, materials.yellow);

        const tip = new THREE.Mesh(sphereGeometry, materials.yellow);
        tip.position.set(0, 1, 0);
        const shaft = new Line2(lineGeometry, materials.lineYellow);
        handle.add(tip, shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = [`gizmo:${name}`, () => { }];
        knob.position.copy(tip.position);
        picker.add(knob);

        super(gizmoName, editor, { handle, picker });

        this.shaft = shaft;
        this.tip = tip;
        this.knob = knob;
        this.plane = plane;

        this.startPosition = new THREE.Vector3();
        this.originalLength = 0;
        this.currentLength = 0;

        this.worldQuaternion = new THREE.Quaternion();
        this.worldPosition = new THREE.Vector3();
    }

    onPointerHover(intersect: Intersector): void { }

    onPointerUp(intersect: Intersector, info: MovementInfo) {
        this.originalLength = this.currentLength;
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) throw new Error("invalid precondition");
        this.startPosition.copy(planeIntersect.point);
    }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect === undefined) return; // this only happens when the user is dragging through different viewports.

        const dist = planeIntersect.point.sub(this.startPosition).dot(new THREE.Vector3(0, 1, 0).applyQuaternion(this.worldQuaternion));
        let length = this.originalLength + dist;
        length = Math.max(0, length);
        this.render(length);
        this.currentLength = length;
        cb(length);
    }

    originalLength: number;
    currentLength: number;
    set length(length: number) {
        this.render(length);
        this.originalLength = this.currentLength = length;
    }

    render(length: number) {
        this.shaft.scale.y = length + 1;
        this.tip.position.set(0, length + 1, 0);
        this.knob.position.copy(this.tip.position);
    }

    update(camera: THREE.Camera) {
        const { worldQuaternion, worldPosition } = this;
        this.getWorldQuaternion(worldQuaternion);
        this.getWorldPosition(worldPosition);

        super.update(camera);

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
        this.plane.position.copy(this.position);
    }
}
