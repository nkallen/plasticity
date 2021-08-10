import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from "../../editor/SnapManager";
import { vec2cart } from "../../util/Conversion";
import { GeometryFactory } from '../GeometryFactory';
import { CenterRectangleFactory, DiagonalRectangleFactory, ThreePointRectangleFactory } from "../rect/RectangleFactory";

type FourCorners = { p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3 }

abstract class BoxFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);

    async computeGeometry() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [vec2cart(p1), vec2cart(p2), vec2cart(p3), vec2cart(p4),]
        return c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, this.names);
    }

    protected abstract orthogonal(): FourCorners;
}

export class ThreePointBoxFactory extends BoxFactory {
    p3!: THREE.Vector3;
    p4!: THREE.Vector3;

    static AB = new THREE.Vector3();
    static BC = new THREE.Vector3();
    static heightNormal = new THREE.Vector3();
    static height = new THREE.Vector3();

    static reorientHeight(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, upper: THREE.Vector3): FourCorners {
        const { AB, BC, heightNormal, height } = this;

        AB.copy(p2).sub(p1)
        BC.copy(p3).sub(p2);
        heightNormal.copy(AB).cross(BC).normalize();
        const h = height.copy(upper).sub(p3).dot(heightNormal);

        const p4 = heightNormal.multiplyScalar(h).add(p3);
        if (h < 0) return { p1: p2, p2: p1, p3, p4 }
        else return { p1, p2, p3, p4 }
    }

    protected orthogonal() {
        const { p1, p2, p3 } = ThreePointRectangleFactory.orthogonal(this.p1, this.p2, this.p3);
        return ThreePointBoxFactory.reorientHeight(p1, p2, p3, this.p4);
    }
}

const Z = new THREE.Vector3(0, 0, 1);

abstract class DiagonalBoxFactory extends BoxFactory {
    p3!: THREE.Vector3;
    constructionPlane = new PlaneSnap();

    protected orthogonal() {
        const { corner1, p2: corner2, p3: upper, constructionPlane } = this;
        const { p1, p2, p3 } = DiagonalRectangleFactory.orthogonal(corner1, corner2, constructionPlane);

        return ThreePointBoxFactory.reorientHeight(p1, p2, p3, upper);
    }

    abstract get corner1(): THREE.Vector3;
}

export class CornerBoxFactory extends DiagonalBoxFactory {
    get corner1() { return this.p1 }
}

export class CenterBoxFactory extends DiagonalBoxFactory {
    get corner1() {
        return CenterRectangleFactory.corner1(this.p1, this.p2);
    }
}