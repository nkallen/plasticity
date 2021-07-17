import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "./AbstractGizmo";
import { CircleGeometry } from "../util/Util";

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

    update(camera: THREE.Camera): void {
        super.update(camera);

        this.circle.lookAt(camera.position);
        this.torus.lookAt(camera.position);
    }
}

const arrowGeometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 12, 1, false);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);

export class DistanceGizmo extends AbstractGizmo<(distance: number) => void> {
    private readonly tip: THREE.Mesh;
    private readonly knob: THREE.Mesh;
    private readonly shaft: THREE.Mesh;
    private readonly plane: THREE.Mesh;

    constructor(name: string, editor: EditorLike) {
        const [gizmoName,] = name.split(':');
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const plane = new THREE.Mesh(planeGeometry, materials.yellowTransparent);

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

        const delta = planeIntersect.point.distanceTo(this.position);
        this.render(delta);
        cb(Math.abs(delta));
    }

    render(delta: number) {
        this.shaft.scale.y = delta;
        this.tip.position.set(0, delta, 0);
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
