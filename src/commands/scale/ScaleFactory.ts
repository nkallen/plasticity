import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class ScaleFactory extends GeometryFactory {
    _items!: visual.Item[];
    origin!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    originalScale!: THREE.Vector3;
    originalPosition!: THREE.Vector3;

    get items() {
        return this._items;
    }

    set items(objs: visual.Item[]) {
        this._items = objs;
        this.originalScale = objs[0].scale.clone();
        this.originalPosition = objs[0].position.clone();
    }

    async doUpdate() {
        const { items, origin, p2, p3 } = this;
        for (const item of items) {
            item.scale.copy(this.originalScale);
            item.position.copy(this.originalPosition);

            const oldLength = p2.clone().sub(origin).length()
            const newLength = p3.clone().sub(origin).length();
            const scaleFactor = (newLength / oldLength);

            item.position.sub(origin);
            item.position.multiplyScalar(scaleFactor);
            item.position.add(origin);
            item.scale.multiplyScalar(scaleFactor);
        }
    }

    async doCommit() {
        const result = [];
        const { items, origin, p2, p3 } = this;
        for (const item of items) {
            const model = this.db.lookup(item);
            this.db.removeItem(item);

            const oldLength = p2.clone().sub(origin).length()
            const newLength = p3.clone().sub(origin).length();
            const scaleFactor = (newLength / oldLength);

            const names = new c3d.SNameMaker(c3d.CreatorType.TransformedSolid, c3d.ESides.SideNone, 0);
            const params = new c3d.TransformValues(scaleFactor, scaleFactor, scaleFactor, new c3d.CartPoint3D(origin.x, origin.y, origin.z));
            let transformed;
            if (model instanceof c3d.Solid) {
                transformed = c3d.ActionDirect.TransformedSolid(model, c3d.CopyMode.Copy, params, names);
            } else if (model instanceof c3d.SpaceInstance) {
                transformed = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
                const mat = new c3d.Matrix3D();
                mat.Scale(scaleFactor, scaleFactor, scaleFactor);
                transformed.Transform(mat);
            } else throw new Error("invalid precondition");
            result.push(this.db.addItem(transformed));
        }
        return Promise.all(result);
    }

    doCancel() {
        for (const item of this.items) {
            item.scale.copy(this.originalScale);
        }
    }
}