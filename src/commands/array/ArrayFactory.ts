import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { derive } from "../../command/FactoryBuilder";
import { GeometryFactory } from '../../command/GeometryFactory';
import { composeMainName, point2point, unit, vec2vec } from "../../util/Conversion";
import * as visual from "../../visual_model/VisualModel";

export interface ArrayParams {
    dir1: THREE.Vector3;
    step1: number;
    num1: number;

    dir2: THREE.Vector3;
    step2: number;
    num2: number;

    center: THREE.Vector3;
    isAlongAxis: boolean;
}

export interface RadialArrayParams extends ArrayParams {
    degrees: number;
}

abstract class AbstractArrayFactory extends GeometryFactory implements ArrayParams {
    protected _solid!: { view?: visual.Solid, model?: c3d.Solid };
    protected readonly start: number = 0;

    @derive(visual.Solid) get solid(): visual.Solid { throw '' }
    set solid(solid: visual.Solid | c3d.Solid) { }

    protected _curve!: { view?: visual.SpaceInstance<visual.Curve3D>, model?: c3d.Curve3D };
    @derive(visual.Curve3D) get curve(): visual.SpaceInstance<visual.Curve3D> { throw '' }
    set curve(curve: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D) { }

    get object() {
        return this.solid ?? this.curve;
    }

    dir1!: THREE.Vector3;
    step1 = 0;
    private _num1 = 2;
    get num1() { return this._num1 }
    set num1(num1: number) {
        if (num1 < 1) throw new Error("invalid argument");
        this._num1 = Math.trunc(num1);
    }

    dir2!: THREE.Vector3;

    abstract num2: number;
    abstract step2: number;
    protected abstract readonly isPolar: boolean;

    center = new THREE.Vector3();
    isAlongAxis = false;

    protected get params() {
        const { isPolar, dir1, step1, num1, dir2, step2, num2, center, isAlongAxis } = this;
        return new c3d.DuplicationMeshValues(isPolar, vec2vec(dir1, 1), unit(step1), num1, vec2vec(dir2, 1), step2, num2, point2point(center), isAlongAxis);
    }

    async calculate() {
        const { params, _solid: { model: solid }, _curve: { model: curve }, start } = this;

        const item = solid ?? curve;
        if (item === undefined) throw new Error("invalid precondition");
        const result = [];
        let matrices = params.GenerateTransformMatrices();
        matrices = matrices.slice(start, 100); // NOTE: a bit paranoid about users making a mistake
        let normalize = matrices[0];
        normalize = normalize.Div(new c3d.Matrix3D());
        const normalized = item.Duplicate().Cast<c3d.Item>(item.IsA());
        normalized.Transform(normalize);
        for (const matrix of matrices) {
            const dup = normalized.Duplicate().Cast<c3d.Item>(normalized.IsA());
            dup.Transform(matrix);
            if (dup instanceof c3d.Curve3D) result.push(new c3d.SpaceInstance(dup));
            else result.push(dup);
        }
        return result;
    }

    get originalItem() {
        return this.object;
    }
}

export class RadialArrayFactory extends AbstractArrayFactory {
    protected readonly isPolar = true;
    protected override readonly start = 1;

    private _num2 = 0;
    get num2() { return this._num2 }
    set num2(num2: number) {
        num2 = Math.max(1, num2);
        const degrees = this.degrees;
        this._num2 = Math.floor(num2);
        this.degrees = degrees;
    }

    step2 = 2 * Math.PI;
    get degrees() { return this.step2 * this.num2 / Math.PI * 180 }
    set degrees(degrees: number) {
        this.step2 = 2 * Math.PI * (degrees / 360) / this.num2;
    }
}

export class RectangularArrayFactory extends AbstractArrayFactory {
    protected readonly isPolar = false;

    private _num2 = 0;
    get num2() { return this._num2 }
    set num2(num2: number) { this._num2 = Math.floor(num2) }

    step2 = 1;

    protected get params() {
        const { isPolar, dir1, step1, num1, dir2, step2, num2, center, isAlongAxis } = this;
        return new c3d.DuplicationMeshValues(isPolar, vec2vec(dir1, 1), unit(step1), num1, vec2vec(dir2, 1), unit(step2), Math.max(num2, 1), point2point(center), isAlongAxis);
    }
}