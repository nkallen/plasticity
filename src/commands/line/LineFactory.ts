import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point } from "../../util/Conversion";
import { GeometryFactory } from '../GeometryFactory';

export default class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    async calculate() {
        const { p1, p2 } = this;
        const line = new c3d.Polyline3D([point2point(p1), point2point(p2)], false);
        return new c3d.SpaceInstance(line);
    }
}