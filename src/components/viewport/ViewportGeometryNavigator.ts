import * as THREE from "three";
import { ViewportNavigatorExecutor, Orientation } from "./ViewportNavigator";
import * as visual from '../../visual_model/VisualModel';
import { OrbitControls } from "./OrbitControls";
import { DatabaseLike } from "../../editor/DatabaseLike";
import { point2point, vec2vec } from "../../util/Conversion";
import { PlaneDatabase } from "../../editor/PlaneDatabase";
import { ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { FaceSnap } from "../../editor/snaps/Snap";

export class ViewportGeometryNavigator extends ViewportNavigatorExecutor {
    constructor(
        private readonly db: DatabaseLike,
        controls: OrbitControls,
        private readonly planes: PlaneDatabase,
    ) {
        super(controls);
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
            const faceSnap = new FaceSnap(to, db.lookupTopologyItem(to));
            return planes.temp(new FaceConstructionPlaneSnap(normal, target, faceSnap));
        } else {
            return this.animateToOrientation(to);
        }
    }
}
