import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Editor } from '../../Editor';
import { AbstractGizmo, Intersector, MovementInfo } from "../AbstractGizmo";

const sphereGeometry = new THREE.SphereGeometry(0.1);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0, 0, 0, 0, 1, 0]);

export class FilletGizmo extends AbstractGizmo<(radius: number) => void> {
    constructor(editor: Editor, point: THREE.Vector3, normal: THREE.Vector3) {
        const materials = editor.gizmos;

        const sphere = new THREE.Mesh(sphereGeometry, materials.yellow);
        sphere.position.set(0, 1, 0);
        const line = new Line2(lineGeometry, materials.lineYellow);
        const picker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), materials.invisible);
        picker.position.set(0, 0.6, 0);
        const handle = new THREE.Group();
        handle.add(sphere, line);
        super("fillet", editor, { handle: handle, picker: picker });

        this.position.copy(point);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    }

    onPointerDown(_intersect: Intersector): void {}
    
    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo): void {
        cb(info.pointEnd2d.sub(info.pointStart2d).length());
    }
}