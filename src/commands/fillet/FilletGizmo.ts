import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "../AbstractGizmo";

const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const planeGeometry = new THREE.PlaneGeometry(10, 10, 2, 2);

export class FilletGizmo extends AbstractGizmo<(radius: number) => void> {
    private readonly sphere: THREE.Mesh;
    private readonly line: THREE.Mesh;
    private readonly plane: THREE.Mesh;
    private readonly normal: THREE.Vector3;

    constructor(editor: EditorLike, origin: THREE.Vector3, normal: THREE.Vector3) {
        const materials = editor.gizmos;

        const plane = new THREE.Mesh(planeGeometry, materials.yellowTransparent);
        plane.lookAt(0, 0, 1);

        plane.updateMatrixWorld();

        const sphere = new THREE.Mesh(sphereGeometry, materials.yellow);
        const line = new Line2(lineGeometry, materials.lineYellow);
        line.scale.y = 0;
        const handle = new THREE.Group();
        handle.add(sphere, line);

        const picker = new THREE.Group();
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), materials.yellowTransparent);
        knob.userData.command = ['gizmo:fillet:distance', () => {

        }];
        picker.add(knob);

        super("fillet", editor, { handle: handle, picker: picker });

        this.position.copy(origin);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.sphere = sphere;
        this.line = line;
        this.plane = plane;

        plane.position.copy(origin);
        plane.quaternion.copy(this.quaternion);
        plane.updateMatrixWorld();
        this.normal = normal;
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) { }
    onPointerUp(intersect: Intersector, info: MovementInfo) { }

    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        const planeIntersect = intersect(this.plane, true);
        if (!planeIntersect) throw "corrupt intersection query";

        const delta = planeIntersect.point.sub(this.position).dot(this.normal);

        this.render(delta);
        cb(Math.abs(delta));
    }

    render(delta: number) {
        this.line.scale.y = delta;
        this.sphere.position.set(0, delta, 0);
        this.picker.position.copy(this.sphere.position);
    }
}