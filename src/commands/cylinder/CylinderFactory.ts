import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { vec2cart } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
export default class CylinderFactory extends GeometryFactory {
    base!: THREE.Vector3;
    radius!: THREE.Vector3;
    height!: THREE.Vector3;

    names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);

    private readonly Z = new THREE.Vector3();
    private readonly _radius = new THREE.Vector3();

    async computeGeometry() {
        const { base, height } = this;

        const { Z, _radius } = this;

        Z.copy(this.height).sub(this.base);
        const radius = _radius.copy(this.radius).sub(this.base).length();

        _radius.copy(Z).cross(X);
        if (_radius.lengthSq() < 10e-5) _radius.copy(Z).cross(Y);

        _radius.normalize().multiplyScalar(radius).add(base);

        const points = [vec2cart(base), vec2cart(height), vec2cart(_radius)]

        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, this.names);
        return sphere;
    }
}