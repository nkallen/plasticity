import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { GizmoMaterialDatabase } from "../../commands/GizmoMaterials";
import { Helper, SimpleHelper } from "../../util/Helpers";
import { CircleGeometry } from "../../util/Util";
import { PointSnap } from "./Snap";
import { SnapResult } from "./SnapManager";

const nearbyGeometry = new THREE.CircleGeometry(0.05, 16);
const snapGeometry = new LineGeometry();
snapGeometry.setPositions(CircleGeometry(0.1, 16));

export class SnapPresenter {
    constructor(private readonly materials: GizmoMaterialDatabase) { }

    nearbyIndicatorFor(snap: PointSnap): Helper {
        const disc = new SimpleHelper(new THREE.Mesh(nearbyGeometry, this.materials.black.hover.mesh));

        // const { position, orientation } = snap;
        disc.position.copy(snap.position);
        // disc.quaternion.copy(orientation);
        return disc;
    }

    snapIndicatorFor(intersection: SnapResult): Helper {
        const circle = new SimpleHelper(new Line2(snapGeometry, this.materials.black.line2));

        const { position, orientation } = intersection;
        circle.position.copy(position);
        circle.quaternion.copy(orientation);
        return circle;
    }
}
