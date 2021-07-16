import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { vec2cart } from "../../util/Conversion";
import { GeometryFactory } from '../Factory';

export class CenterEllipseFactory extends GeometryFactory {
    center!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;

    protected async computeGeometry() {
        const { center, p2, p3 } = this;
        const circle = new c3d.Arc3D(vec2cart(center), vec2cart(p2), vec2cart(p3), 0);

        return new c3d.SpaceInstance(circle);
    }
}

export class ThreePointEllipseFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p3!: THREE.Vector3;
    private radial = new THREE.Vector3();
    private _p2!: THREE.Vector3;
    private center!: THREE.Vector3;

    get p2() { return this._p2 }
    set p2(point: THREE.Vector3) {
        const { p1, radial } = this;
        this._p2 = point;
        radial.copy(point).sub(p1).multiplyScalar(0.5);
        this.center = new THREE.Vector3().copy(p1).add(radial);
    }

    protected async computeGeometry() {
        const { center, p2, p3 } = this;
        const circle = new c3d.Arc3D(vec2cart(center), vec2cart(p2), vec2cart(p3), 0);

        return new c3d.SpaceInstance(circle);
    }
}
