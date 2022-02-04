import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { GizmoMaterialDatabase } from "./GizmoMaterials";
import { Helper, SimpleHelper } from "../util/Helpers";
import { CircleGeometry } from "../util/Util";
import { SnapResult } from "../editor/snaps/SnapPicker";
import { PointSnap } from "../editor/snaps/Snap";

const nearbyGeometry = new THREE.CircleGeometry(0.025, 24);
const snapGeometry = new LineGeometry();
snapGeometry.setPositions(CircleGeometry(0.1, 24));

const nearbyMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, blending: THREE.MultiplyBlending });

export class SnapIndicator {
    constructor(private readonly materials: GizmoMaterialDatabase) { }

    nearbyIndicatorFor(snap: PointSnap): Helper {
        const disc = new SimpleHelper(new THREE.Mesh(nearbyGeometry, nearbyMaterial));

        const { position } = snap;
        const { orientation } = snap.project(position);
        disc.position.copy(snap.position);
        disc.quaternion.copy(orientation);
        return disc;
    }

    snapIndicatorFor(intersection: SnapResult): Helper {
        const circle = new SimpleHelper(new Line2(snapGeometry, this.materials.darkGray.line2));

        const { cursorPosition, orientation } = intersection;
        circle.position.copy(cursorPosition);
        circle.quaternion.copy(orientation);
        return circle;
    }
}
