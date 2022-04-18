import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { composeMainName, point2point } from '../../util/Conversion';
import { MultiBooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

export interface EditCylinderParams {
    radius: number;
    height: number;
}

interface CylinderFactoryLike extends GeometryFactory {
    p0: THREE.Vector3;
    p1: THREE.Vector3;
    p2: THREE.Vector3;
}

export default class CylinderFactory extends GeometryFactory implements CylinderFactoryLike {
    p0!: THREE.Vector3;
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ElementarySolid, this.db.version), c3d.ESides.SideNone, 0);

    private readonly Z = new THREE.Vector3();
    private readonly _radius = new THREE.Vector3();

    async calculate() {
        const { p0: base, p2: height } = this;

        const { Z, _radius } = this;

        Z.copy(this.p2).sub(this.p0);
        const radius = _radius.copy(this.p1).sub(this.p0).length();

        _radius.copy(Z).cross(X);
        if (_radius.lengthSq() < 10e-5) _radius.copy(Z).cross(Y);

        _radius.normalize().multiplyScalar(radius).add(base);

        const points = [point2point(base), point2point(height), point2point(_radius)]

        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, this.names);
        return sphere;
    }
}

export class EditableCylinderFactory extends GeometryFactory implements CylinderFactoryLike, EditCylinderParams {
    private readonly cylinder = new CylinderFactory(this.db, this.materials, this.signals);

    get height() {
        const { p0, _height } = this;
        return _height.distanceTo(p0);
    }
    private readonly _height = new THREE.Vector3();
    set height(h: number) {
        const { _height, axis, p0 } = this;
        _height.copy(axis).multiplyScalar(h).add(p0);
    }

    get radius() {
        const { p0, _radius } = this;
        return _radius.distanceTo(p0);
    }
    private readonly _radius = new THREE.Vector3();
    set radius(r: number) {
        const { _radius, radialAxis, p0, p1 } = this;
        _radius.copy(radialAxis).multiplyScalar(r).add(p0);
    }

    readonly axis = new THREE.Vector3();
    private radialAxis = new THREE.Vector3();

    private _p0!: THREE.Vector3;
    get p0() { return this._p0 }
    set p0(p0: THREE.Vector3) { this._p0 = p0 }

    private _p1!: THREE.Vector3;
    get p1() { return this._p1 }
    set p1(p1: THREE.Vector3) {
        this._p1 = p1;
        this._radius.copy(p1);
        this.radialAxis.copy(p1).sub(this.p0).normalize();
    }

    private _p2!: THREE.Vector3;
    get p2() { return this._p2 }
    set p2(p2: THREE.Vector3) {
        this._p2 = p2;
        this._height.copy(p2);
        this.axis.copy(p2).sub(this.p0).normalize();
    }

    async calculate() {
        const { cylinder, p0, _radius, _height } = this;
        cylinder.p0 = p0;
        cylinder.p1 = _radius;
        cylinder.p2 = _height;
        return cylinder.calculate();
    }
}

export class PossiblyBooleanCylinderFactory extends PossiblyBooleanFactory<CylinderFactoryLike> implements EditCylinderParams {
    protected bool = new MultiBooleanFactory(this.db, this.materials, this.signals);
    protected fantom = new EditableCylinderFactory(this.db, this.materials, this.signals);

    get p0() { return this.fantom.p0 }
    get p1() { return this.fantom.p1 }
    get p2() { return this.fantom.p2 }

    set p0(base: THREE.Vector3) { this.fantom.p0 = base }
    set p1(radius: THREE.Vector3) { this.fantom.p1 = radius }
    set p2(height: THREE.Vector3) { this.fantom.p2 = height }

    get axis() { return this.fantom.axis }

    get radius() { return this.fantom.radius }
    get height() { return this.fantom.height }

    set radius(radius: number) { this.fantom.radius = radius }
    set height(height: number) { this.fantom.height = height }
}
