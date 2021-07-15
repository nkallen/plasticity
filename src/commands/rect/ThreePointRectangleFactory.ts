import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../Factory';

export class ThreePointRectangleFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;

    protected async computeGeometry() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z)
        ]
        const line = new c3d.Polyline3D(points, true);
        return new c3d.SpaceInstance(line);
    }


    private orthogonal() {
        const { p1, p2 } = this;
        let { p3 } = this;

        const AB = p2.clone().sub(p1);
        let BC = p3.clone().sub(p2);
        const heightNormal = AB.clone().cross(BC).normalize();

        const depthNormal = AB.clone().cross(heightNormal).normalize();
        const depth = p3.clone().sub(p2).dot(depthNormal);
        BC = depthNormal.multiplyScalar(depth);
        p3 = BC.clone().add(p2);

        const p4 = p3.clone().sub(p2).add(p1);

        return { p1, p2, p3, p4 };
    }
}

export class CornerRectangleFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    protected async computeGeometry() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z)
        ]
        const line = new c3d.Polyline3D(points, true);
        return new c3d.SpaceInstance(line);
    }


    private orthogonal() {
        const { p1, p2 } = this;

        return {
            p1: p1,
            p2: new THREE.Vector3(p1.x, p2.y, p2.z),
            p3: p2,
            p4: new THREE.Vector3(p2.x, p1.y, p1.z)
        };
    }
}