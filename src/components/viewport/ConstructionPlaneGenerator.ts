import c3d from '../../../build/Release/c3d.node';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { PlaneDatabase } from "../../editor/PlaneDatabase";
import { ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { FaceSnap } from "../../editor/snaps/Snap";
import { SnapManager } from "../../editor/snaps/SnapManager";
import { point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { Orientation } from "./ViewportNavigator";


export class ConstructionPlaneGenerator {
    constructor(private readonly db: DatabaseLike, private readonly planes: PlaneDatabase, private readonly snaps: SnapManager) { }

    constructionPlane(to: visual.Face | visual.PlaneInstance<visual.Region> | Orientation): ConstructionPlaneSnap {
        const { db, planes, snaps } = this;
        if (to instanceof visual.Face) {
            const model = db.lookupTopologyItem(to);
            const placement = model.GetControlPlacement();
            model.OrientPlacement(placement);
            placement.Normalize(); // FIXME: for some reason necessary with curved faces
            const normal = vec2vec(placement.GetAxisY(), 1);
            const target = point2point(model.Point(0.5, 0.5));
            const faceSnap = snaps.identityMap.lookup(to) as FaceSnap;
            return planes.temp(new FaceConstructionPlaneSnap(normal, target, undefined, faceSnap));
        } else if (to instanceof visual.PlaneInstance) {
            const model = db.lookup(to);
            const placement = model.GetPlacement();
            const normal = vec2vec(placement.GetAxisZ(), 1);
            const cube = new c3d.Cube();
            model.AddYourGabaritTo(cube);
            const min = point2point(cube.pmin), max = point2point(cube.pmax);
            const target = min.add(max).multiplyScalar(0.5);
            return planes.temp(new ConstructionPlaneSnap(normal, target));
        } else {
            return this.constructionPlaneForOrientation(to);
        }
    }

    private constructionPlaneForOrientation(to: Orientation) {
        switch (to) {
            case Orientation.posX: return PlaneDatabase.YZ;
            case Orientation.posY: return PlaneDatabase.XZ;
            case Orientation.posZ: return PlaneDatabase.XY;
            case Orientation.negX: return PlaneDatabase.YZ;
            case Orientation.negY: return PlaneDatabase.XZ;
            case Orientation.negZ: return PlaneDatabase.XY;
        }
    }
}
