import * as THREE from "three";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "../AbstractGizmo";

const sphereGeometry = new THREE.SphereGeometry(0.1);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);
const planeGeometry = new THREE.PlaneGeometry(10, 10, 2, 2);

export class ElementarySolidGizmo extends AbstractGizmo<(point: THREE.Vector3, i: number) => void> {
    private index?: number;
    private readonly plane: THREE.Mesh;

    constructor(editor: EditorLike, points: THREE.Vector3[]) {
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();
        for (const [i, point] of points.entries()) {
            const sphere = new THREE.Mesh(sphereGeometry, materials.yellow);
            sphere.position.copy(point);
            handle.add(sphere);

            const pick = new THREE.Mesh(sphereGeometry, materials.invisible);
            pick.position.copy(point);
            pick.userData.index = i;
            picker.add(pick);
        }

        super("offset-face", editor, { handle: handle, picker: picker });

        this.plane = new THREE.Mesh(planeGeometry, materials.invisible);
    }

    onPointerHover(intersect: Intersector): void {
        const picker = intersect(this.picker, true);
        if (picker) this.index = picker.object.userData.index as number;
        else this.index = undefined;
    }

    onPointerDown(intersect: Intersector, info: MovementInfo): void {
        if (this.index === undefined) throw new Error("invalid state");
    }

    onPointerUp(intersect: Intersector, info: MovementInfo) {}

    onPointerMove(cb: (point: THREE.Vector3, i: number) => void, intersect: Intersector, info: MovementInfo): void {
        if (this.index === undefined) throw new Error("invalid state");

        const intersection = intersect(info.constructionPlane.snapper, true);
        if (intersection) {
            cb(intersection.point, this.index!);
        }
    }

    update(camera: THREE.Camera) {}
}