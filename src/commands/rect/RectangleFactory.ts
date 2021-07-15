import { PlaneSnap } from "../../SnapManager";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../Factory';

abstract class RectangleFactory extends GeometryFactory {
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

    protected abstract orthogonal(): { p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3 };
}

export class ThreePointRectangleFactory extends RectangleFactory {
    p3!: THREE.Vector3;

    private AB = new THREE.Vector3();
    private BC = new THREE.Vector3();
    private heightNormal = new THREE.Vector3();
    private depthNormal = new THREE.Vector3();
    private p4 = new THREE.Vector3();

    protected orthogonal() {
        const { p1, p2, AB, BC, heightNormal, depthNormal, p4 } = this;
        let { p3 } = this;

        AB.copy(p2).sub(p1);
        BC.copy(p3).sub(p2);
        heightNormal.copy(AB).cross(BC).normalize();

        depthNormal.copy(AB).cross(heightNormal).normalize();
        const depth = p3.clone().sub(p2).dot(depthNormal);
        BC.copy(depthNormal.multiplyScalar(depth));
        p3 = BC.add(p2);

        p4.copy(p3).sub(p2).add(p1);

        return { p1, p2, p3, p4 };
    }
}

abstract class DiagonalRectangleFactory extends RectangleFactory {
    constructionPlane = new PlaneSnap();

    private quat = new THREE.Quaternion();
    private inv = new THREE.Quaternion();
    private c1 = new THREE.Vector3();
    private c2 = new THREE.Vector3();

    protected orthogonal() {
        const { corner1, p2, quat, constructionPlane, inv, c1, c2 } = this;

        quat.setFromUnitVectors(constructionPlane.n, new THREE.Vector3(0, 0, 1));
        inv.copy(quat).invert();

        c1.copy(corner1).applyQuaternion(quat);
        c2.copy(p2).applyQuaternion(quat);

        return {
            p1: corner1,
            p2: new THREE.Vector3(c1.x, c2.y, c2.z).applyQuaternion(inv),
            p3: p2,
            p4: new THREE.Vector3(c2.x, c1.y, c1.z).applyQuaternion(inv)
        };
    }

    abstract get corner1(): THREE.Vector3;
}

export class CornerRectangleFactory extends DiagonalRectangleFactory {
    get corner1() { return this.p1 }
}

export class CenterRectangleFactory extends DiagonalRectangleFactory {
    private AB = new THREE.Vector3();
    private _corner1 = new THREE.Vector3();

    get corner1() {
        const { p1, p2, AB, _corner1 } = this;

        AB.copy(p2).sub(p1);
        const c1 = _corner1.copy(p1).sub(AB);

        return c1;
    }
}