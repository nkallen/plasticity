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
    get solid(): visual.Solid { return this._solid }
    set solid(solid: visual.Solid | c3d.Solid) {
        if (solid instanceof visual.Solid) {
            this._solid = solid;
            this.model = this.db.lookup(solid);
        } else {
            this.model = solid;
        }
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

    async calculate2() {
        const point1 = new c3d.CartPoint(0, -100);
        const point2 = new c3d.CartPoint(0, 100);
        const line = c3d.ActionCurve.Line(point1, point2);

        const { solid, model, origin, orientation, names, db } = this;
        const { X, Y, Z } = this;

        const placement = new c3d.Placement3D();

        const contour = new c3d.Contour([line], true);
        const direction = new c3d.Vector3D(0, 0, 0);

        const flags = new c3d.MergingFlags(true, true);

        const params = new c3d.ShellCuttingParams(placement, contour, false, direction, -1, flags, true, names);
        const results = c3d.ActionSolid.SolidCutting(model, c3d.CopyMode.Copy, params);
        const result = results[0];
        return result;
        
        // await db.didModifyTemporarily(() => super.doUpdate());
    }

    get originalItem() { return this.solid }
}