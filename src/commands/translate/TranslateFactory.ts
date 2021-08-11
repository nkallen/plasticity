import { mat2mat, vec2cart } from "../../util/Conversion";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

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
        const { matrix } = this;

        for (const item of this.items) {
            matrix.decompose(item.position, item.quaternion, item.scale);
            item.updateMatrixWorld();
        }
    }

    async computeGeometry() {
        const { models, transform, names } = this;

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
        for (const item of this.items) {
            item.position.set(0, 0, 0);
            item.quaternion.set(0, 0, 0, 1);
            item.scale.set(1, 1, 1);
        }
    }

    protected abstract get transform(): c3d.TransformValues

    get originalItem() { return this.items }
}

export class MoveFactory extends TranslateFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    private readonly delta = new THREE.Vector3();
    protected get transform(): c3d.TransformValues {
        const { delta, p1, p2 } = this;

        delta.copy(p2).sub(p1);
        const params = new c3d.TransformValues();
        const vec = new c3d.Vector3D(delta.x, delta.y, delta.z);
        params.Move(vec);
        return params;
    }
}

export class RotateFactory extends TranslateFactory {
    point!: THREE.Vector3
    axis!: THREE.Vector3;
    angle!: number;

    async doUpdate() {
        const { items, point, axis, angle } = this;
        for (const item of items) {
            item.position.set(0, 0, 0);

            item.position.sub(point);
            item.position.applyAxisAngle(axis, angle);
            item.position.add(point);
            item.quaternion.setFromAxisAngle(axis, angle);
        }
    }

    protected get transform(): c3d.TransformValues {
        const { axis, angle, point } = this;

        const mat = new c3d.Matrix3D();
        const p = new c3d.CartPoint3D(point.x, point.y, point.z);
        const v = new c3d.Vector3D(axis.x, axis.y, axis.z);
        const axi = new c3d.Axis3D(p, v);
        const rotation = mat.Rotate(axi, angle);

        return new c3d.TransformValues(rotation);
    }
}