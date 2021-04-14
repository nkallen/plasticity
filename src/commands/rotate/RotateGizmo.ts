import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Editor } from '../../Editor';
import { CircleGeometry } from "../../Util";
import * as visual from "../../VisualModel";
import { AbstractGizmo, Intersector, MovementInfo } from "../AbstractGizmo";

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
        const circle = new Line2(geometry, editor.gizmos.line);
        circle.renderOrder = Infinity;

        const picker = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 4, 24), matInvisible);

        super(editor, { handle: circle, picker: picker, delta: null, helper: null });

        this.position.copy(p1);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    }

    onPointerDown(intersect: Intersector) {}
    
    onPointerMove(cb: (offset: number) => void, intersect: Intersector, info: MovementInfo) {
        cb(info.angle);
    }
}

