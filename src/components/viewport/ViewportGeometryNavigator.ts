import * as THREE from "three";
import { ViewportNavigator, Orientation } from "./ViewportNavigator";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { DatabaseLike } from "../../editor/DatabaseLike";
import { point2point, vec2vec } from "../../util/Conversion";
import { ConstructionPlaneSnap } from "../../editor/snaps/Snap";
import { PlaneDatabase } from "../../editor/PlaneDatabase";

export class ViewportGeometryNavigator extends ViewportNavigator {
    constructor(
        private readonly db: DatabaseLike,
        controls: OrbitControls,
        private readonly planes: PlaneDatabase,
        container: HTMLElement,
        dim: number
    ) {
        super(controls, container, dim);
    }

    navigate(to: Orientation | visual.Face): ConstructionPlaneSnap {
        const { db, planes } = this;
        if (to instanceof visual.Face) {
            const model = db.lookupTopologyItem(to);
            const placement = model.GetControlPlacement();
            model.OrientPlacement(placement);
            placement.Normalize(); // FIXME: for some reason necessary with curved faces
            const normal = vec2vec(placement.GetAxisY(), 1);
            const target = point2point(model.Point(0.5, 0.5));
            this.controls.target.copy(target);
            this.animateToPositionAndQuaternion(normal, new THREE.Quaternion());
            return planes.temp(new ConstructionPlaneSnap(normal, target));
        } else {
            return this.animateToOrientation(to);
        }
    }
}
