import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { composeMainName, unit } from '../../util/Conversion';
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

    protected facesModel: c3d.Face[] = [];
    set faces(faces: visual.Face[] | c3d.Face[]) {
        if (faces.length === 0) {
            this.facesModel = [];
        } else if (faces[0] instanceof visual.Face) {
            const facesModel = [];
            for (const face of faces as visual.Face[]) {
                const model = this.db.lookupTopologyItem(face);
                facesModel.push(model);
            }
            this.facesModel = facesModel;
        } else {
            this.facesModel = faces as c3d.Face[];
        }
    }

    thickness1 = 0;
    thickness2 = 0;

    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ThinShellCreator, this.db.version), c3d.ESides.SideNone, 0);

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

export class ThickFaceFactory extends GeometryFactory implements ThinSolidParams {
    private readonly thinSolid = new ThinSolidFactory(this.db, this.materials, this.signals);
    set solid(solid: visual.Solid) {
        this.thinSolid.solid = solid;
    }

    set thickness1(thickness1: number) { this.thinSolid.thickness1 = thickness1 }
    set thickness2(thickness2: number) { this.thinSolid.thickness2 = thickness2 }

    set faces(faces: visual.Face[]) {
        const solid = this.db.lookup(this.thinSolid.solid);
        const models = solid.GetFaces();
        const map = new Map<number, c3d.Face>(models.entries());
        for (const face of faces) {
            map.delete(face.index);
        }
        this.thinSolid.faces = [...map.values()];
    }

    calculate() {
        return this.thinSolid.calculate();
    }

}