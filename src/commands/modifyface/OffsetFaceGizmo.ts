import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "../AbstractGizmo";

const sphereGeometry = new THREE.SphereGeometry(0.1);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const planeGeometry = new THREE.PlaneGeometry(10, 10, 2, 2);

export class OffsetFaceGizmo extends AbstractGizmo<(radius: number) => void> {
    private readonly normal: THREE.Vector3;
    private readonly plane: THREE.Mesh;
    private readonly pointStart: THREE.Vector3;
    private readonly pointEnd: THREE.Vector3;
    private readonly sphere: THREE.Mesh;
    private readonly line: THREE.Mesh;

    constructor(editor: EditorLike, point: THREE.Vector3, normal: THREE.Vector3) {
        const materials = editor.gizmos;

        const sphere = new THREE.Mesh(sphereGeometry, materials.yellow);
        const line = new Line2(lineGeometry, materials.lineYellow);
        line.scale.y = 0;
        const picker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), materials.invisible);

        const handle = new THREE.Group();
        handle.add(sphere, line);
        super("offset-face", editor, { handle: handle, picker: picker });

        this.position.copy(point);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.normal = normal;
        this.plane = new THREE.Mesh(planeGeometry, materials.invisible);

        this.pointStart = new THREE.Vector3();
        this.pointEnd = new THREE.Vector3();
        this.line = line;
        this.sphere = sphere;
    }

    onPointerDown(intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (!planeIntersect) throw "corrupt intersection query";
        this.pointStart.copy(planeIntersect.point);
    }

    onPointerUp(intersect: Intersector, info: MovementInfo) { }


    onPointerMove(cb: (radius: number) => void, intersect: Intersector, _info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (planeIntersect == null) return; // this only happens when the is dragging through different viewports.

        this.pointEnd.copy(planeIntersect.point);

        const delta = this.pointEnd.sub(this.pointStart).dot(this.normal);
        console.log(delta);
        this.line.scale.y = delta;
        this.sphere.position.set(0, delta, 0);
        cb(delta);
    }

    update(camera: THREE.Camera): void {
        super.update(camera);

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();
        const align = new THREE.Vector3();
        const dir = new THREE.Vector3();

        align.copy(eye).cross(this.normal);
        dir.copy(this.normal).cross(align);

        const matrix = new THREE.Matrix4();
        matrix.lookAt(new THREE.Vector3(0, 0, 0), dir, align);
        this.plane.quaternion.setFromRotationMatrix(matrix);
        this.plane.updateMatrixWorld();
    }
}