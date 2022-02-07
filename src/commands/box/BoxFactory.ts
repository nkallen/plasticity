import * as THREE from "three";
import { Vector3 } from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory, ValidationError } from '../../command/GeometryFactory';
import { composeMainName, point2point } from "../../util/Conversion";
import { MultiBooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";
import { CenterRectangleFactory, DiagonalRectangleFactory, ThreePointRectangleFactory } from "../rect/RectangleFactory";

type FourCorners = { p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3 }

interface BoxParams {
    p1: THREE.Vector3;
    p2: THREE.Vector3;
    p3: THREE.Vector3;
}

export interface EditBoxParams {
    width: number;
    length: number;
    height: number;
}

abstract class BoxFactory extends GeometryFactory implements BoxParams, EditBoxParams {
    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ElementarySolid, this.db.version), c3d.ESides.SideNone, 0);

    abstract p1: THREE.Vector3;
    abstract p2: THREE.Vector3;
    abstract p3: THREE.Vector3;

    async calculate() {
        const { p1, p2, p3, p4 } = this.orthogonal();

        const points = [point2point(p1), point2point(p2), point2point(p3), point2point(p4),]
        return c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, this.names);
    }

    private static readonly AB = new THREE.Vector3();
    private static readonly BC = new THREE.Vector3();
    private static readonly _heightNormal = new THREE.Vector3();

    static heightNormal(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
        const { AB, BC, _heightNormal } = this;
        AB.copy(p2).sub(p1)
        BC.copy(p3).sub(p2);
        return _heightNormal.copy(AB).cross(BC).normalize();
    }

    protected abstract orthogonal(width?: number, length?: number, height?: number): FourCorners;

    abstract width: number;
    abstract length: number;
    abstract height: number;

    abstract get heightNormal(): THREE.Vector3;
}

export class ThreePointBoxFactory extends BoxFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    p4!: THREE.Vector3;

    width!: number;
    length!: number;
    height!: number;

    private static readonly height = new THREE.Vector3();
    private static readonly p1 = new THREE.Vector3();
    private static readonly p2 = new THREE.Vector3();
    private static readonly p3 = new THREE.Vector3();

    static reorientHeight(_p1: THREE.Vector3, _p2: THREE.Vector3, _p3: THREE.Vector3, upper: THREE.Vector3, _width?: number, _length?: number, _height?: number) {
        const { height } = this;
        let { p1, p2, p3 } = this;
        p1.copy(_p1); p2.copy(_p2); p3.copy(_p3);

        if (_width !== undefined) {
            p2.sub(p1).normalize().multiplyScalar(_width).add(p1);
        }
        if (_length !== undefined) {
            p3.sub(_p2).normalize().multiplyScalar(_length).add(p2);
        }

        const heightNormal = this.heightNormal(p1, p2, p3);
        let h = height.copy(upper).sub(p3).dot(heightNormal);
        if (_height !== undefined) h = Math.sign(h) * _height;

        if (Math.abs(h) < 10e-5) throw new ValidationError("invalid height");

        const p4 = heightNormal.multiplyScalar(h).add(p3);
        if (h < 0) [p1, p2] = [p2, p1];

        return { p1, p2, p3, p4, h };
    }

    protected orthogonal(width?: number, length?: number, height?: number) {
        const { p1, p2, p3 } = ThreePointRectangleFactory.orthogonal(this.p1, this.p2, this.p3);
        return ThreePointBoxFactory.reorientHeight(p1, p2, p3, this.p4);
    }

    get heightNormal(): THREE.Vector3 {
        return ThreePointBoxFactory.heightNormal(this.p1, this.p2, this.p3);
    }
}

interface DiagonalBoxParams extends BoxParams {
    orientation: THREE.Quaternion;
    get heightNormal(): THREE.Vector3;
}

abstract class DiagonalBoxFactory extends BoxFactory implements DiagonalBoxParams {
    protected orthogonal(width?: number, length?: number, height?: number): FourCorners {
        const { corner1, p2: corner2, p3: upper, normal } = this;
        const { p1, p2, p3 } = DiagonalRectangleFactory.orthogonal(corner1, corner2, normal);

        return ThreePointBoxFactory.reorientHeight(p1, p2, p3, upper, width, length, height);
    }

    abstract get corner1(): THREE.Vector3;

    get heightNormal() {
        const { corner1, p2: corner2, normal } = this;
        const { p1, p2, p3 } = DiagonalRectangleFactory.orthogonal(corner1, corner2, normal);

        return BoxFactory.heightNormal(p1, p2, p3);
    }

    protected _orientation = new THREE.Quaternion();
    get orientation() { return this._orientation; }

    set orientation(orientation: THREE.Quaternion) {
        this._normal.copy(Z).applyQuaternion(this._orientation);
    }

    private readonly _normal = new THREE.Vector3();
    get normal() { return this._normal }
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class CornerBoxFactory extends DiagonalBoxFactory {
    private _width?: number;
    private __width!: number;
    get width() { return this._width ?? this.__width }
    set width(width: number) { this._width = width }

    private _length?: number;
    private __length!: number;
    get length() { return this._length ?? this.__length }
    set length(length: number) { this._length = length }

    private _height?: number;
    private __height!: number;
    get height() { return this._height ?? this.__height }
    set height(height: number) { this._height = height }

    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    private _p3!: THREE.Vector3;
    get p3() { return this._p3 }
    set p3(_p3: THREE.Vector3) {
        this._p3 = _p3;
        const { corner1, p2: corner2, normal } = this;
        const { p1, p2, p3 } = DiagonalRectangleFactory.orthogonal(corner1, corner2, normal);
        this.__width = p2.distanceTo(p1);
        this.__length = p3.distanceTo(p2);
        const AB = p2.clone().sub(p1).normalize();
        const BC = p3.clone().sub(p2).normalize();
        const { h } = ThreePointBoxFactory.reorientHeight(p1, p2, p3, _p3);;
        this.__height = h;
        const mat = new THREE.Matrix4();
        mat.makeBasis(AB, BC, normal.multiplyScalar(Math.sign(h)));
        this._orientation.setFromRotationMatrix(mat).normalize();
    }

    async calculate() {
        const { _width, _length, _height } = this;
        const { p1, p2, p3, p4 } = this.orthogonal(_width, _length, _height);

        const points = [point2point(p1), point2point(p2), point2point(p3), point2point(p4),]
        return c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, this.names);
    }

    get corner1() { return this.p1 }
}

export class CenterBoxFactory extends DiagonalBoxFactory {
    private _width!: number;
    get width() { return this._width }
    private _length!: number;
    get length() { return this._length }
    private _height!: number;
    get height() { return this._height }

    p1!: Vector3;
    p2!: Vector3;
    p3!: Vector3;

    get corner1() {
        return CenterRectangleFactory.corner1(this.p1, this.p2);
    }
}

abstract class PossiblyBooleanBoxFactory<B extends BoxFactory> extends PossiblyBooleanFactory<B> implements BoxParams, EditBoxParams {
    protected bool = new MultiBooleanFactory(this.db, this.materials, this.signals);
    protected abstract fantom: B;

    get p1() { return this.fantom.p1 }
    get p2() { return this.fantom.p2 }
    get p3() { return this.fantom.p3 }

    set p1(p1: THREE.Vector3) { this.fantom.p1 = p1 }
    set p2(p2: THREE.Vector3) { this.fantom.p2 = p2 }
    set p3(p3: THREE.Vector3) { this.fantom.p3 = p3 }

    get width() { return this.fantom.width }
    get height() { return this.fantom.height }
    get length() { return this.fantom.length }

    set width(width: number) { this.fantom.width = width }
    set height(height: number) { this.fantom.height = height }
    set length(length: number) { this.fantom.length = length }
}

export class PossiblyBooleanThreePointBoxFactory extends PossiblyBooleanBoxFactory<ThreePointBoxFactory> {
    protected fantom = new ThreePointBoxFactory(this.db, this.materials, this.signals);

    get p4() { return this.fantom.p4 }
    set p4(p4: THREE.Vector3) { this.fantom.p4 = p4 }
}

abstract class PossiblyBooleanDiagonalBoxFactory extends PossiblyBooleanBoxFactory<DiagonalBoxFactory> implements DiagonalBoxParams {
    get orientation() { return this.fantom.orientation }
    get heightNormal() { return this.fantom.heightNormal }

    set orientation(orientation: THREE.Quaternion) { this.fantom.orientation = orientation }
}

export class PossiblyBooleanCenterBoxFactory extends PossiblyBooleanDiagonalBoxFactory implements DiagonalBoxParams {
    protected fantom = new CenterBoxFactory(this.db, this.materials, this.signals);
}

export class PossiblyBooleanCornerBoxFactory extends PossiblyBooleanDiagonalBoxFactory implements DiagonalBoxParams {
    protected fantom = new CornerBoxFactory(this.db, this.materials, this.signals);
}