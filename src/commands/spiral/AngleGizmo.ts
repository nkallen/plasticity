import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../../util/Util";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "../AbstractGizmo";

const radius = 1;

export class AngleGizmo extends AbstractGizmo<(angle: number) => void> {
    private readonly circle: THREE.Mesh;
    private readonly torus: THREE.Mesh;

    constructor(editor: EditorLike) {
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const geometry = new LineGeometry();
        geometry.setPositions(CircleGeometry(radius, 64));
        const circle = new Line2(geometry, materials.line);
        handle.add(circle);

        const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
        torus.userData.command = ['gizmo:spiral:angle', () => { }];
        picker.add(torus);

        super("spiral", editor, { handle, picker });

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

export class DistanceGizmo extends AbstractGizmo<(distance: number) => void> {
    private readonly tip: THREE.Mesh;
    private readonly knob: THREE.Mesh;
    private readonly shaft: THREE.Mesh;
    private readonly vector: THREE.Vector3;

    constructor(editor: EditorLike, vector: THREE.Vector3) {
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const length = vector.length();

        const tip = new THREE.Mesh(arrowGeometry, materials.yellow);
        tip.position.set(0, length, 0);
        const shaft = new Line2(lineGeometry, materials.lineYellow);
        shaft.scale.y = length;
        handle.add(tip, shaft);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.invisible);
        knob.userData.command = ['gizmo:spiral:distance', () => { }];
        knob.position.copy(tip.position);
        picker.add(knob);

        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(Y, vector);
        handle.quaternion.copy(quat);
        picker.quaternion.copy(quat);

        super("spiral", editor, { handle, picker });

        this.shaft = shaft;
        this.tip = tip;
        this.knob = knob;
        this.vector = vector;
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerDown(intersect: Intersector, info: MovementInfo) { }
    onPointerUp(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const delta = info.pointEnd3d.distanceTo(this.position);
        this.render(delta);
        cb(Math.abs(delta));
    }

    render(delta: number) {
        this.shaft.scale.y = delta;
        this.tip.position.set(0, delta, 0);
        this.knob.position.copy(this.tip.position);
    }

    update(camera: THREE.Camera) {}
}

