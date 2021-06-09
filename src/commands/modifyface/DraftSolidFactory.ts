import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../GeometryDatabase';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export class DraftSolidFactory extends GeometryFactory {
    angle!: number;
    origin!: THREE.Vector3;
    axis!: THREE.Vector3;

    faces = new Array<visual.Face>();
    solid!: visual.Solid;
    protected solidModel!: c3d.Solid;
    private names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);

    private temp?: TemporaryObject;

    async doUpdate() {
        const { solid, faces, origin, axis, angle, names } = this;
        const model = this.db.lookup(solid);
        const faces_ = faces.map(f => this.db.lookupTopologyItem(f));
        const placement = new c3d.Placement3D();
        placement.SetAxisX(new c3d.Vector3D(axis.x, axis.y, axis.z));
        placement.Move(new c3d.Vector3D(origin.x, origin.y, origin.z));

        const drafted = await c3d.ActionSolid.DraftSolid_async(model, c3d.CopyMode.Copy, placement, angle, faces_, c3d.FacePropagation.All, false, names);
        const temp = await this.db.addTemporaryItem(drafted);

        solid.visible = false;
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { solid, faces, origin, axis, angle, names } = this;
        this.temp?.cancel();
        const model = this.db.lookup(solid);
        const faces_ = faces.map(f => this.db.lookupTopologyItem(f));
        const placement = new c3d.Placement3D();
        placement.SetAxisX(new c3d.Vector3D(axis.x, axis.y, axis.z));
        placement.Move(new c3d.Vector3D(origin.x, origin.y, origin.z));

        const drafted = await c3d.ActionSolid.DraftSolid_async(model, c3d.CopyMode.Copy, placement, angle, faces_, c3d.FacePropagation.All, false, names);
        const result = await this.db.addItem(drafted);
        this.db.removeItem(solid);
        return result;
    }

    doCancel() {
        this.solid.visible = true;
        this.temp?.cancel();
    }
}