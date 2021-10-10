import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { unit } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';

export interface ThinSolidParams {
    thickness1: number;
    thickness2: number;
}

export class ThinSolidFactory extends GeometryFactory implements ThinSolidParams {
    private _solid!: visual.Solid;
    protected solidModel!: c3d.Solid;
    get solid() { return this._solid }
    set solid(obj: visual.Solid) {
        this._solid = obj;
        this.solidModel = this.db.lookup(this.solid);
    }

    private _faces = new Array<visual.Face>();
    protected facesModel!: c3d.Face[];
    get faces() { return this._faces }
    set faces(faces: visual.Face[]) {
        this._faces = faces;

        const facesModel = [];
        for (const face of faces) {
            const model = this.db.lookupTopologyItem(face);
            facesModel.push(model);
        }
        this.facesModel = facesModel;
    }

    thickness1 = 0;
    thickness2 = 0;

    protected names = new c3d.SNameMaker(c3d.CreatorType.ThinShellCreator, c3d.ESides.SideNone, 0);

    calculate() {
        const { solidModel, facesModel, names, thickness1, thickness2 } = this;

        const params = new c3d.SweptValues();
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);
        params.shellClosed = true;
        return c3d.ActionSolid.ThinSolid_async(solidModel, c3d.CopyMode.Copy, facesModel, [], [], params, names, true);
    }

    get originalItem() {
        return this.solid;
    }
}