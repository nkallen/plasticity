import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../editor/GeometryDatabase';
import { composeMainName, point2point, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory } from '../../command/GeometryFactory';
import { RotateFactoryLike } from '../translate/TranslateFactory';

export class DraftSolidFactory extends GeometryFactory implements RotateFactoryLike {
    angle!: number;
    pivot!: THREE.Vector3;
    axis = new THREE.Vector3(1, 0, 0);
    normal!: THREE.Vector3;

    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.DraftSolid, this.db.version), c3d.ESides.SideNone, 0);

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

    private readonly z = new THREE.Vector3();
    private readonly x = new THREE.Vector3();
    async calculate() {
        const { solidModel: solid, facesModel: faces, pivot, axis, angle, names, normal, x, z } = this;

        z.crossVectors(axis, normal);
        x.crossVectors(z, axis);
        const placement = new c3d.Placement3D(point2point(pivot), vec2vec(z, 1), vec2vec(x, 1), false);

        return await c3d.ActionSolid.DraftSolid_async(solid, c3d.CopyMode.Copy, placement, angle, faces, c3d.FacePropagation.All, false, names);
    }

    protected get originalItem() { return this.solid }

    private _phantom?: TemporaryObject;
    async showPhantoms() {
        const phantom = await this.db.addPhantom(this.solidModel, { mesh: mesh_blue, line: this.materials.lineDashed() });
        phantom.show();
        this._phantom = phantom;
    }

    protected cleanupTempsOnFinishOrCancel() {
        super.cleanupTempsOnFinishOrCancel();
        this._phantom?.cancel();
    }
}

const mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0xff00ff);
mesh_blue.opacity = 0.01;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;
