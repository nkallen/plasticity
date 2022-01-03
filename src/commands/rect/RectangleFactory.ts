import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory, NoOpError } from '../../command/GeometryFactory';
import { point2point } from "../../util/Conversion";

type FourCorners = { p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3 };

abstract class RectangleFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    async calculate() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [point2point(p1), point2point(p2), point2point(p3), point2point(p4),]

        const line = new c3d.Polyline3D(points, true);
        return new c3d.SpaceInstance(line);
    }

    protected abstract orthogonal(): FourCorners;
}

export class ThreePointRectangleFactory extends RectangleFactory {
    p3!: THREE.Vector3;

    private static readonly AB = new THREE.Vector3();
    private static readonly BC = new THREE.Vector3();
    private static readonly heightNormal = new THREE.Vector3();
    private static readonly depthNormal = new THREE.Vector3();
    private static readonly p4 = new THREE.Vector3();

    static orthogonal(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): FourCorners {
        const { AB, BC, heightNormal, depthNormal, p4 } = this;

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

    protected orthogonal() {
        const { p1, p2, p3 } = this;
        return ThreePointRectangleFactory.orthogonal(p1, p2, p3);
    }
}

export abstract class DiagonalRectangleFactory extends RectangleFactory {
    orientation = new THREE.Quaternion();

    private static readonly quat = new THREE.Quaternion();
    private static readonly toX = new THREE.Quaternion();
    private static readonly inv = new THREE.Quaternion();
    private static readonly c1 = new THREE.Vector3();
    private static readonly c2 = new THREE.Vector3();

    static orthogonal(corner1: THREE.Vector3, corner2: THREE.Vector3, normal: THREE.Vector3): FourCorners {
        const { quat, toX, inv, c1, c2 } = this;

        // Reorient our points onto an XY plane that is axis aligned.
        // If we're already axis aligned though, be careful about floating point issues!!
        quat.setFromUnitVectors(normal, Z);
        toX.setFromUnitVectors(normal, X);
        const perpendicularToX = Math.abs(normal.dot(X)) < 10e-6;
        const parallelToX = Math.abs(Math.abs(normal.dot(X)) - 1) < 10e-6;
        const parallelToZ = Math.abs(normal.dot(Z)) > 1 - 10e-6;
        if (!perpendicularToX && !parallelToX && !parallelToZ) quat.premultiply(toX);

        inv.copy(quat).invert();

        c1.copy(corner1).applyQuaternion(quat);
        c2.copy(corner2).applyQuaternion(quat);

        return {
            p1: corner1,
            p2: new THREE.Vector3(c1.x, c2.y, c2.z).applyQuaternion(inv),
            p3: corner2,
            p4: new THREE.Vector3(c2.x, c1.y, c1.z).applyQuaternion(inv)
        };
    }

    protected orthogonal(): FourCorners {
        const { corner1, p2, normal } = this;
        if (corner1.manhattanDistanceTo(p2) < 10e-5) throw new NoOpError();
        return DiagonalRectangleFactory.orthogonal(corner1, p2, normal);
    }

    private readonly _normal = new THREE.Vector3();
    private get normal() {
        return this._normal.copy(Z).applyQuaternion(this.orientation)
    }

    abstract get corner1(): THREE.Vector3;
}

const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);

export class CornerRectangleFactory extends DiagonalRectangleFactory {
    get corner1() { return this.p1 }
}

export class CenterRectangleFactory extends DiagonalRectangleFactory {
    private static readonly AB = new THREE.Vector3();
    private static readonly _corner1 = new THREE.Vector3();

    static corner1(p1: THREE.Vector3, p2: THREE.Vector3) {
        const { AB, _corner1 } = this;

        AB.copy(p2).sub(p1);
        const c1 = _corner1.copy(p1).sub(AB);

        return c1;
    }

    get corner1() {
        return CenterRectangleFactory.corner1(this.p1, this.p2);
    }
}