import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point } from "../../util/Conversion";
import { GeometryFactory } from '../GeometryFactory';

export interface SpiralParams {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    p3: THREE.Vector3;
    radius: number;
    step: number;
    angle: number;
}
export class SpiralFactory extends GeometryFactory implements SpiralParams {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3 = new THREE.Vector3();
    radius!: number;
    step = 4;
    angle = 0;

    async calculate() {
        const { p1, p2, p3, radius, step, angle } = this;
        const pitch = p2.distanceTo(p1) / step;

        const spiral = c3d.ActionCurve3D.SpiralCurve(point2point(p1), point2point(p2), point2point(p3), radius, pitch, angle, null, false);

        return new c3d.SpaceInstance(spiral);
    }
}
