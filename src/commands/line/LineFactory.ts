import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export default class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    async calculate() {
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const line = c3d.ActionCurve3D.SplineCurve([point1, point2], false, c3d.SpaceType.Polyline3D);
        return new c3d.SpaceInstance(line);
    }
}