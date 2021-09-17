import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from "../../editor/GeometryDatabase";
import * as visual from '../../editor/VisualModel';
import { deunit, mat2mat, point2point, unit, vec2vec } from "../../util/Conversion";
import { GeometryFactory, NoOpError } from '../GeometryFactory';

abstract class TranslateFactory extends GeometryFactory {
    _items!: visual.Item[];
    private models!: c3d.Item[];

    get items() { return this._items }
    set items(items: visual.Item[]) {
        this._items = items;
        const models = [];
        for (const item of items) {
            models.push(this.db.lookup(item));
        }
        this.models = models;
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.TransformedSolid, c3d.ESides.SideNone, 0);

    private readonly _matrix = new THREE.Matrix4();
    get matrix(): THREE.Matrix4 {
        const { transform, _matrix } = this;
        const mat = transform.GetMatrix();
        mat2mat(mat, _matrix);
        return _matrix;
    }

    async doUpdate() {
        const { matrix, db, items } = this;
        let result: Promise<TemporaryObject>[] = [];
        for (const item of items) {
            const temps = db.optimization(item, async () => {
                matrix.decompose(item.position, item.quaternion, item.scale);
                item.position.multiplyScalar(deunit(1));
                item.updateMatrixWorld();

                return [{
                    underlying: item,
                    show() { },
                    cancel() { },
                }] as TemporaryObject[];
            }, () => this.doOriginalUpdate(item));
            const temp = temps.then(t => t[0]);
            result.push(temp);
        }
        return Promise.all(result);
    }

    protected doOriginalUpdate(item?: visual.Item) {
        return super.doUpdate(item);
    }

    async calculate(only?: visual.Item) {
        const { transform, names } = this;
        let { models } = this;
        if (only !== undefined) models = [this.db.lookup(only)];

        const mat = transform.GetMatrix();

        const result = [];
        for (const model of models) {
            let transformed;
            if (model instanceof c3d.Solid) {
                transformed = c3d.ActionDirect.TransformedSolid(model, c3d.CopyMode.Copy, transform, names);
            } else if (model instanceof c3d.SpaceInstance) {
                transformed = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
                transformed.Transform(mat);
            } else throw new Error("invalid precondition");
            result.push(transformed);
        }
        return Promise.all(result);
    }

    doCancel() {
        const { db, items } = this;
        for (const item of items) {
            item.position.set(0, 0, 0);
            item.quaternion.set(0, 0, 0, 1);
            item.scale.set(1, 1, 1);
        }
        super.doCancel();
    }

    protected abstract get transform(): c3d.TransformValues

    get originalItem() { return this.items }
}

export interface MoveParams {
    move: THREE.Vector3;
    pivot: THREE.Vector3;
}

export class MoveFactory extends TranslateFactory implements MoveParams {
    move = new THREE.Vector3();
    pivot!: THREE.Vector3;

    protected get transform(): c3d.TransformValues {
        const { move } = this;

        if (move.manhattanLength() < 10e-6) throw new NoOpError();

        const params = new c3d.TransformValues();
        params.Move(vec2vec(move));
        return params;
    }
}

export interface RotateParams {
    pivot: THREE.Vector3
    axis: THREE.Vector3;
    angle: number;
    degrees: number;
}

export class RotateFactory extends TranslateFactory implements RotateParams {
    pivot!: THREE.Vector3
    axis = new THREE.Vector3(1, 0, 0);
    angle = 0;

    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    // I'm honestly not sure why we can't use apply matrices as in TranslateFactory above,
    // but this works instead.
    async doUpdate() {
        const { items, pivot: point, axis, angle, db } = this;
        axis.normalize();
        let result: Promise<TemporaryObject>[] = [];
        for (const item of items) {
            const temps = db.optimization(item, async () => {
                if (angle === 0) return [];

                item.position.set(0, 0, 0);
                item.position.sub(point);
                item.position.applyAxisAngle(axis, angle);
                item.position.add(point);
                item.quaternion.setFromAxisAngle(axis, angle);

                return [{
                    underlying: item,
                    show() { },
                    cancel() { },
                }] as TemporaryObject[]
            }, () => this.doOriginalUpdate(item));
            const temp = temps.then(t => t[0]);
            result.push(temp);
        }
        return Promise.all(result);
    }

    protected get transform(): c3d.TransformValues {
        const { axis, angle, pivot: point } = this;

        if (angle === 0) throw new NoOpError();

        const mat = new c3d.Matrix3D();
        const p = point2point(point);
        const v = vec2vec(axis, 1);
        const axi = new c3d.Axis3D(p, v);
        const rotation = mat.Rotate(axi, angle);

        return new c3d.TransformValues(rotation);
    }
}

export interface ScaleParams {
    scale: THREE.Vector3;
    pivot: THREE.Vector3;
}

const identity = new THREE.Vector3(1, 1, 1);
export class ScaleFactory extends TranslateFactory implements ScaleParams {
    scale = new THREE.Vector3(1, 1, 1);
    pivot = new THREE.Vector3();

    protected get transform(): c3d.TransformValues {
        const { scale, pivot } = this;
        if (scale.equals(identity)) throw new NoOpError();

        return new c3d.TransformValues(scale.x, scale.y, scale.z, point2point(pivot));
    }
}