import { PlaneSnap } from "../../editor/SnapManager";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../editor/EditorSignals';
import { GeometryDatabase } from "../../editor/GeometryDatabase";
import MaterialDatabase from '../../editor/MaterialDatabase';
import { GeometryFactory } from '../GeometryFactory';

abstract class BoxFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
    }

    async computeGeometry() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z),
        ]
        return c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, this.names);
    }

    protected abstract orthogonal(): { p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3 };
}

export class ThreePointBoxFactory extends BoxFactory {
    p3!: THREE.Vector3;
    p4!: THREE.Vector3;

    private AB = new THREE.Vector3();
    private BC = new THREE.Vector3();
    private heightNormal = new THREE.Vector3();
    private height = new THREE.Vector3();
    private depth = new THREE.Vector3();
    private depthNormal = new THREE.Vector3();

    protected orthogonal() {
        const { p1, p2, AB, BC, heightNormal, height, depthNormal, depth } = this;
        let { p3, p4 } = this;

        AB.copy(p2).sub(p1)
        BC.copy(p3).sub(p2);
        heightNormal.copy(AB).cross(BC).normalize();
        const h = height.copy(p4).sub(p3).dot(heightNormal);

        depthNormal.copy(AB).cross(heightNormal).normalize();
        const d = depth.copy(p3).sub(p2).dot(depthNormal);
        BC.copy(depthNormal).multiplyScalar(d)
        p3.copy(BC).add(p2);

        p4 = heightNormal.multiplyScalar(h).add(p3);
        if (h < 0) return { p1: p2, p2: p1, p3, p4 }
        else return { p1, p2, p3, p4 }
    }
}

abstract class DiagonalBoxFactory extends BoxFactory {
    p3!: THREE.Vector3;
    constructionPlane = new PlaneSnap();

    private quat = new THREE.Quaternion();
    private inv = new THREE.Quaternion();
    private c1 = new THREE.Vector3();
    private c2 = new THREE.Vector3();

    protected orthogonal() {
        const { corner1, p2, p3, quat, constructionPlane, inv, c1, c2 } = this;

        quat.setFromUnitVectors(constructionPlane.n, new THREE.Vector3(0, 0, 1));
        inv.copy(quat).invert();

        c1.copy(corner1).applyQuaternion(quat);
        c2.copy(p2).applyQuaternion(quat);

        return {
            p1: corner1,
            p2: new THREE.Vector3(c1.x, c2.y, c2.z).applyQuaternion(inv),
            p3: p2,
            p4: p3
        };
    }

    abstract get corner1(): THREE.Vector3;
}

export class CornerBoxFactory extends DiagonalBoxFactory {
    get corner1() { return this.p1 }
}

export class CenterBoxFactory extends DiagonalBoxFactory {
    private AB = new THREE.Vector3();
    private _corner1 = new THREE.Vector3();

    get corner1() {
        const { p1, p2, AB, _corner1 } = this;

        AB.copy(p2).sub(p1);
        const c1 = _corner1.copy(p1).sub(AB);

        return c1;
    }
}