import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

abstract class ModifyFaceFactory extends GeometryFactory {
    protected abstract operationType: c3d.ModifyingType;
    direction = new THREE.Vector3();

    private _faces = new Array<visual.Face>();
    protected facesModel!: c3d.Face[];
    private _solid!: visual.Solid;
    protected solidModel!: c3d.Solid;
    private names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);


    get solid() {
        return this._solid;
    }

    set solid(obj: visual.Solid) {
        this._solid = obj;
        this.solidModel = this.db.lookup(this.solid);
    }

    get faces() {
        return this._faces;
    }

    set faces(faces) {
        this._faces = faces;

        const facesModel = [];
        for (const face of faces) {
            const model = this.db.lookupTopologyItem(face);
            facesModel.push(model);
        }
        this.facesModel = facesModel;
    }

    protected async computeGeometry() {
        const { solidModel, facesModel, direction } = this;

        const params = new c3d.ModifyValues();
        params.way = this.operationType;
        params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);
        const result = await c3d.ActionDirect.FaceModifiedSolid_async(solidModel, c3d.CopyMode.Copy, params, facesModel, this.names);
        return result;
    }

    get keys() { return ['direction'] }
    get originalItem() { return this.solid }
}

export class RemoveFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Remove;
}

export class CreateFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Create;
}

export class ActionFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Action;
}

export class OffsetFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Offset;
}

export class FilletFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Fillet;
}

export class SuppleFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Supple;
}

export class PurifyFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Purify;
}

export class MergerFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.Merger;
}

export class UnitedFaceFactory extends ModifyFaceFactory {
    operationType = c3d.ModifyingType.United;
}