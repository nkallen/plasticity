import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { vec2cart } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';
import * as THREE from "three";

export class MirrorFactory extends GeometryFactory {
    curve!: visual.SpaceInstance<visual.Curve3D>;
    origin!: THREE.Vector3;
    normal!: THREE.Vector3;

    async calculate() {
        const { origin, normal } = this;
        const model = this.db.lookup(this.curve);
        const transformed = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const mat = new c3d.Matrix3D();
        mat.Symmetry(new c3d.CartPoint3D(origin.x, origin.y, origin.z), new c3d.Vector3D(normal.x, normal.y, normal.z));
        transformed.Transform(mat);

        return transformed;
    }
}

export class SymmetryFactory extends GeometryFactory {
    origin!: THREE.Vector3;
    orientation!: THREE.Quaternion;

    private model!: c3d.Solid;
    private _solid!: visual.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    private readonly X = new THREE.Vector3(1, 0, 0);
    private readonly Y = new THREE.Vector3(0, 1, 0);
    private readonly Z = new THREE.Vector3(0, 0, 1);

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.SymmetrySolid, c3d.ESides.SideNone, 0);

    async calculate() {
        const { model, origin, orientation, names } = this;
        const { X, Y, Z } = this;

        Z.set(0, 0, 1).applyQuaternion(orientation);
        X.set(1, 0, 0).applyQuaternion(orientation);

        const z = new c3d.Vector3D(Z.x, Z.y, Z.z);
        const x = new c3d.Vector3D(X.x, X.y, X.z);

        const placement = new c3d.Placement3D(vec2cart(origin), z, x, false);

        return c3d.ActionSolid.SymmetrySolid(model, c3d.CopyMode.Copy, placement, names);
    }

    get originalItem() { return this.solid }
}