import { vec2cart } from "../../util/Conversion";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from "../../SnapManager";
import { GeometryFactory } from '../Factory';

export class CenterPointArcFactory extends GeometryFactory {
    center!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    constructionPlane = new PlaneSnap();

    private Cp2 = new THREE.Vector3();
    private Cp3 = new THREE.Vector3();
    private cross = new THREE.Vector3();

    private lastQuadrant = 0;
    private sense = false;

    protected async computeGeometry() {
        const { center, p2, p3, constructionPlane, Cp2, Cp3, cross } = this;
        const n = constructionPlane.n;

        Cp2.copy(p2).sub(center);
        Cp3.copy(p3).sub(center);

        const dot = Cp2.dot(Cp3);
        cross.crossVectors(Cp2, Cp3);

        let quadrant;
        const crossDotN = cross.dot(n);
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

        if (cross.manhattanLength() < 10e-6) throw new Error("invalid");

        const Z = new c3d.Vector3D(n.x, n.y, n.z);
        const circle = new c3d.Arc3D(vec2cart(center), vec2cart(p2), vec2cart(p3), Z, this.sense ? 1 : -1);

        return new c3d.SpaceInstance(circle);
    }
}

export class ThreePointArcFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;

    protected async computeGeometry() {
        const { p1, p2, p3 } = this;
        const circle = new c3d.Arc3D(vec2cart(p1), vec2cart(p2), vec2cart(p3), 1, false);

        return new c3d.SpaceInstance(circle);
    }
}
