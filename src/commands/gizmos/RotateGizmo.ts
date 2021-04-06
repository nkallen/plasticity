import { CircleGeometry } from "../../Util";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Editor } from '../../Editor';
import * as visual from "../../VisualModel";
import { AbstractGizmo } from "./AbstractGizmo";

const matInvisible = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false
})
matInvisible.opacity = 0.15;

export class RotateGizmo extends AbstractGizmo<(angle: number) => void> {
    constructor(editor: Editor, object: visual.SpaceItem, p1: THREE.Vector3, axis: THREE.Vector3) {
        const geometry = new LineGeometry();
        geometry.setPositions(CircleGeometry(1, 32));
        const circle = new Line2(geometry, editor.materials.gizmo());
        circle.renderOrder = Infinity;

        const picker = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 4, 24), matInvisible);

        super(editor, object, { handle: circle, picker: picker, delta: null, helper: null });

        this.position.copy(p1);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    }

    onPointerMove(cb: (angle: number) => void, pointStart: THREE.Vector2, pointEnd: THREE.Vector2, offset: THREE.Vector2, angle: number) {
        cb(angle);
    }
}

