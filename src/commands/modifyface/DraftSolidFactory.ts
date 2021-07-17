import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export class DraftSolidFactory extends GeometryFactory {
    angle!: number;
    origin!: THREE.Vector3;
    axis!: THREE.Vector3;

    faces = new Array<visual.Face>();
    solid!: visual.Solid;
    protected solidModel!: c3d.Solid;
    private names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);

    protected async computeGeometry() {
        const { solid, faces, origin, axis, angle, names } = this;
        const model = this.db.lookup(solid);
        const faces_ = faces.map(f => this.db.lookupTopologyItem(f));
        const placement = new c3d.Placement3D();
        placement.SetAxisX(new c3d.Vector3D(axis.x, axis.y, axis.z));
        placement.Move(new c3d.Vector3D(origin.x, origin.y, origin.z));

        const drafted = await c3d.ActionSolid.DraftSolid_async(model, c3d.CopyMode.Copy, placement, angle, faces_, c3d.FacePropagation.All, false, names);
        return drafted;
    }

    protected get originalItem() { return this.solid }
}