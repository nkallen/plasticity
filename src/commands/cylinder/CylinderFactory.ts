import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { composeMainName, point2point } from '../../util/Conversion';
import * as visual from "../../visual_model/VisualModel";
import { MultiBooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

export default class CylinderFactory extends GeometryFactory {
    base!: THREE.Vector3;
    radius!: THREE.Vector3;
    height!: THREE.Vector3;

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ElementarySolid, this.db.version), c3d.ESides.SideNone, 0);

    private readonly Z = new THREE.Vector3();
    private readonly _radius = new THREE.Vector3();

    async calculate() {
        const { base, height } = this;

        const { Z, _radius } = this;

        Z.copy(this.height).sub(this.base);
        const radius = _radius.copy(this.radius).sub(this.base).length();

        _radius.copy(Z).cross(X);
        if (_radius.lengthSq() < 10e-5) _radius.copy(Z).cross(Y);

        _radius.normalize().multiplyScalar(radius).add(base);

        const points = [point2point(base), point2point(height), point2point(_radius)]

        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, this.names);
        return sphere;
    }
}

export class PossiblyBooleanCylinderFactory extends PossiblyBooleanFactory<CylinderFactory> {
    protected bool = new MultiBooleanFactory(this.db, this.materials, this.signals);
    protected fantom = new CylinderFactory(this.db, this.materials, this.signals);

    get base() { return this.fantom.base }
    get radius() { return this.fantom.radius }
    get height() { return this.fantom.height }

    set base(base: THREE.Vector3) { this.fantom.base = base }
    set radius(radius: THREE.Vector3) { this.fantom.radius = radius }
    set height(height: THREE.Vector3) { this.fantom.height = height }
}

export interface EditCylinderParams {
    radius: number;
    height: number;
}

export class EditCylinderFactory extends GeometryFactory implements EditCylinderParams {
    get height() {
        const { data, _p0: p0, p1 } = this;
        return p0.distanceTo(p1);
    }
    private readonly _height = new THREE.Vector3();
    set height(h: number) {
        const { data, _axis: axis, _height, _p0: p0  } = this;
        _height.copy(axis).multiplyScalar(h).add(p0);
        data.SetPoint(1, point2point(_height));
        data.ResetIndex();
    }

    get radius() {
        const { data, _p0: p0, p2 } = this;
        return p0.distanceTo(p2);
    }
    private readonly _radius = new THREE.Vector3();
    set radius(r: number) {
        const { data, _p0: p0, p2, _radius: _radius } = this;
        _radius.copy(p2).sub(p0).normalize().multiplyScalar(r).add(p0);
        data.SetPoint(2, point2point(_radius));
        data.ResetIndex();
    }

    private _axis = new THREE.Vector3();
    get axis() { return this._axis }

    private _p0!: THREE.Vector3;
    get p0() { return this._p0 }

    private _cylinder!: { view: visual.Solid, model: c3d.Solid };
    private data!: c3d.ControlData3D;
    private p1!: THREE.Vector3;
    private p2!: THREE.Vector3;
    set cylinder(solid: visual.Solid) {
        let model = this.db.lookup(solid)
        model = model.Duplicate().Cast<c3d.Solid>(c3d.SpaceType.Solid);
        this._cylinder = { view: solid, model };
        const data = model.GetBasisPoints();
        this.data = data;

        this._p0 = point2point(data.GetPoint(0));
        this.p1 = point2point(data.GetPoint(1));
        this.p2 = point2point(data.GetPoint(2));
        this._axis.copy(this.p1).sub(this._p0).normalize();
    }

    async calculate() {
        const { _cylinder: { model }, data } = this;
        model.SetBasisPoints(data);
        model.RebuildItem(c3d.CopyMode.Same);
        model.Refresh();
        return model;
    }

    get originalItem() { return this._cylinder.view }
}