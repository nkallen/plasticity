import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, point2point } from '../../util/Conversion';
import { BooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";
import { GeometryFactory } from '../../command/GeometryFactory';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

interface CylinderParams {
    base: THREE.Vector3;
    radius: THREE.Vector3;
    height: THREE.Vector3;
}

export default class CylinderFactory extends GeometryFactory implements CylinderParams {
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

export class PossiblyBooleanCylinderFactory extends PossiblyBooleanFactory<CylinderFactory> implements CylinderParams {
    protected bool = new BooleanFactory(this.db, this.materials, this.signals);
    protected fantom = new CylinderFactory(this.db, this.materials, this.signals);

    get target() { return this._target }
    set target(solid: visual.Solid | undefined) {
        super.target = solid;
        if (solid !== undefined) this.bool.target = solid;
    }

    get base() { return this.fantom.base }
    get radius() { return this.fantom.radius }
    get height() { return this.fantom.height }

    set base(base: THREE.Vector3) { this.fantom.base = base }
    set radius(radius: THREE.Vector3) { this.fantom.radius = radius }
    set height(height: THREE.Vector3) { this.fantom.height = height }
}