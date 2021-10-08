import { point2point } from '../../util/Conversion';
import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';
import { RotateParams } from '../translate/TranslateFactory';

export class DraftSolidFactory extends GeometryFactory implements RotateParams {
    angle!: number;
    pivot!: THREE.Vector3;
    axis!: THREE.Vector3;

    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    private names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);

    private _solid!: visual.Solid;
    private solidModel!: c3d.Solid;
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

    async calculate() {
        const { solidModel: solid, facesModel: faces, pivot, axis, angle, names } = this;

        const placement = new c3d.Placement3D();
        placement.SetOrigin(point2point(pivot));
        if (axis.dot(new THREE.Vector3(1, 0, 0)) > 1e-6) {
            placement.SetAxisZ(new c3d.Vector3D(0, 1, 0));
        } else if (axis.dot(new THREE.Vector3(0, 1, 0)) > 1e-6) {
            placement.SetAxisZ(new c3d.Vector3D(1, 0, 0));
            placement.SetAxisX(new c3d.Vector3D(0, 1, 0));
        }
        placement.Reset();

        return await c3d.ActionSolid.DraftSolid_async(solid, c3d.CopyMode.Copy, placement, angle, faces, c3d.FacePropagation.All, false, names);
    }

    protected get originalItem() { return this.solid }
}