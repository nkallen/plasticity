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

    faces = new Array<visual.Face>();
    solid!: visual.Solid;
    protected solidModel!: c3d.Solid;
    private names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);

    async calculate() {
        const { solid, faces, pivot, axis, angle, names } = this;
        const model = this.db.lookup(solid);
        const faces_ = faces.map(f => this.db.lookupTopologyItem(f));

        const placement = new c3d.Placement3D();
        placement.SetOrigin(point2point(pivot));
        if (axis.dot(new THREE.Vector3(1, 0, 0)) > 1e-6) {
            placement.SetAxisZ(new c3d.Vector3D(0, 1, 0));
        } else if (axis.dot(new THREE.Vector3(0, 1, 0)) > 1e-6) {
            placement.SetAxisZ(new c3d.Vector3D(1, 0, 0));
            placement.SetAxisX(new c3d.Vector3D(0, 1, 0));
        }
        placement.Reset();

        const drafted = await c3d.ActionSolid.DraftSolid_async(model, c3d.CopyMode.Copy, placement, angle, faces_, c3d.FacePropagation.All, false, names);
        return drafted;
    }

    protected get originalItem() { return this.solid }
}