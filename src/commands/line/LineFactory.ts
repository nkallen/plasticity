import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point } from "../../util/Conversion";
import { GeometryFactory } from '../GeometryFactory';

export default class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    async calculate() {
        const { p1, p2 } = this;
        const line = c3d.ActionCurve3D.SplineCurve([point2point(p1), point2point(p2)], false, c3d.SpaceType.Polyline3D);
        return new c3d.SpaceInstance(line);
    }
}