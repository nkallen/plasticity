import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../GeometryDatabase';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export default class ModifyFaceFactory extends GeometryFactory {
    direction!: THREE.Vector3;

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

    update() {
        const { solid, solidModel, facesModel, direction } = this;

        solid.visible = false;
        this.temp?.cancel();

        const params = new c3d.ModifyValues();
        params.way = c3d.ModifyingType.Action;
        params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);

        const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
        const result = c3d.ActionDirect.FaceModifiedSolid(solidModel, c3d.CopyMode.Copy, params, facesModel, names);
        this.temp = this.db.addTemporaryItems([result]);
        return super.update();
    }

    commit() {
        const { solid, solidModel, facesModel, direction } = this;

        this.temp!.cancel();
        this.db.removeItem(solid);

        const params = new c3d.ModifyValues();
        params.way = c3d.ModifyingType.Action;
        params.direction = new c3d.Vector3D(direction.x, direction.y, direction.z);

        const names = new c3d.SNameMaker(c3d.CreatorType.FaceModifiedSolid, c3d.ESides.SideNone, 0);
        const result = c3d.ActionDirect.FaceModifiedSolid(solidModel, c3d.CopyMode.KeepHistory, params, facesModel, names);
        this.db.addItem(result);

        return super.commit();
    }

    cancel() {
        this.db.scene.add(this.solid);
    }
}