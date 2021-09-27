import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { GizmoMaterialDatabase } from "../../commands/GizmoMaterials";
import { Helper, SimpleHelper } from "../../util/Helpers";
import { CircleGeometry } from "../../util/Util";
import { SnapResult } from "./SnapManager";

const discGeometry = new THREE.CircleGeometry(0.05, 16);
const circleGeometry = new LineGeometry();
circleGeometry.setPositions(CircleGeometry(0.1, 16));

export class SnapPresenter {
    constructor(private readonly materials: GizmoMaterialDatabase) { }

    hoverIndicatorFor(intersection: SnapResult): Helper {
        const disc = new SimpleHelper(new THREE.Mesh(discGeometry, this.materials.black.hover.mesh));

        const { snap, position, orientation } = intersection;
        disc.position.copy(position);
        disc.quaternion.copy(orientation);
        return disc;
    }

    snapIndicatorFor(intersection: SnapResult): Helper {
        const circle = new SimpleHelper(new Line2(circleGeometry, this.materials.black.line2));

        const { snap, position, orientation } = intersection;
        circle.position.copy(position);
        circle.quaternion.copy(orientation);
        return circle;
    }
}
