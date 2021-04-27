import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../GeometryDatabase';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

abstract class ModifyFaceFactory extends GeometryFactory {
    protected abstract operationType: c3d.ModifyingType;
    direction = new THREE.Vector3();

    private _faces = new Array<visual.Face>();
    private facesModel!: c3d.Face[];
    private temp?: TemporaryObject;
    private _solid!: visual.Solid;
    private solidModel!: c3d.Solid;

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

    async doUpdate() {
        const { solid, solidModel, facesModel, direction } = this;

        const params = new c3d.ModifyValues();
        params.way = this.operationType;
        params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);
        const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
        const result = c3d.ActionDirect.FaceModifiedSolid(solidModel, c3d.CopyMode.Copy, params, facesModel, names);

        solid.visible = false;
        this.temp?.cancel();
        this.temp = this.db.addTemporaryItem(result);
    }

    doCommit() {
        const { solid, solidModel, facesModel, direction } = this;

        const params = new c3d.ModifyValues();
        params.way = this.operationType;
        params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);
        const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
        const result = c3d.ActionDirect.FaceModifiedSolid(solidModel, c3d.CopyMode.Copy, params, facesModel, names);

        this.temp?.cancel();
        this.db.removeItem(solid);
        return this.db.addItem(result);
    }

    doCancel() {
        this.solid.visible = true;
        this.temp?.cancel();
    }
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