import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point, vec2vec } from "../../util/Conversion";
import { GeometryFactory } from '../GeometryFactory';

export class CenterPointArcFactory extends GeometryFactory {
    center!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    orientation = new THREE.Quaternion();

    private readonly Cp2 = new THREE.Vector3();
    private readonly Cp3 = new THREE.Vector3();
    private readonly cross = new THREE.Vector3();
    private readonly normal = new THREE.Vector3();

    private lastQuadrant = 0;
    private sense = false;

    async calculate() {
        const { center, p2, p3, Cp2, Cp3, cross, normal, orientation } = this;
        normal.copy(Z).applyQuaternion(orientation);

        Cp2.copy(p2).sub(center);
        Cp3.copy(p3).sub(center);

        const dot = Cp2.dot(Cp3);
        cross.crossVectors(Cp2, Cp3);

        let quadrant;
        const crossDotN = cross.dot(normal);
        if (dot > 0) {
            if (crossDotN > 0) quadrant = 3;
            else quadrant = 0;
        } else {
            if (crossDotN > 0) quadrant = 2;
            else quadrant = 1;
        }

        const diff = quadrant - this.lastQuadrant;
        if (diff == -3 || diff == 3) {
            this.sense = crossDotN > 0;
        }
        this.lastQuadrant = quadrant;

        // if (cross.manhattanLength() < 10e-6) throw new ValidationError();

        const z = vec2vec(normal, 1);
        const circle = new c3d.Arc3D(point2point(center), point2point(p2), point2point(p3), z, this.sense ? 1 : -1);

        return new c3d.SpaceInstance(circle);
    }
}
const Z = new THREE.Vector3(0, 0, 1);
export class ThreePointArcFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;

    async calculate() {
        const { p1, p2, p3 } = this;
        const circle = new c3d.Arc3D(point2point(p1), point2point(p2), point2point(p3), 1, false);

        return new c3d.SpaceInstance(circle);
    }
}
