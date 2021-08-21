import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';
import { MoveParams } from '../translate/TranslateFactory';

export interface OffsetFaceParams {
    distance: number;
    angle: number;
    faces: visual.Face[];
}

export interface FilletFaceParams {
    distance: number;
    faces: visual.Face[];
}

export abstract class ModifyFaceFactory extends GeometryFactory {
    protected abstract operationType: c3d.ModifyingType;
    direction = new THREE.Vector3();

    protected facesModel!: c3d.Face[];
    protected solidModel!: c3d.Solid;
    protected names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);

    private _solid!: visual.Solid;
    get solid() { return this._solid }
    set solid(obj: visual.Solid) {
        this._solid = obj;
        this.solidModel = this.db.lookup(this.solid);
    }

    private _faces = new Array<visual.Face>();
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

    async calculate() {
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

export class ActionFaceFactory extends ModifyFaceFactory implements MoveParams {
    operationType = c3d.ModifyingType.Action;
    pivot = new THREE.Vector3();
    set move(direction: THREE.Vector3) {
        this.direction = direction;
    }
}

export class FilletFaceFactory extends ModifyFaceFactory implements FilletFaceParams {
    operationType = c3d.ModifyingType.Fillet;
    set distance(d: number) { this.direction = new THREE.Vector3(d, 0, 0) }
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