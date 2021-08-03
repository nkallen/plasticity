import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export default class SphereFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;

    async computeGeometry() {
        const points = [
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z),
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z + 1),
            new c3d.CartPoint3D(this.center.x + this.radius, this.center.y, this.center.z),
        ];
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        return sphere;
    }
}
