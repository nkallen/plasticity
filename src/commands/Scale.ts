import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../VisualModel';

export default class ScaleFactory extends GeometryFactory {
    _item!: visual.Item;
    origin!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    originalScale!: THREE.Vector3;
    originalPosition!: THREE.Vector3;

    get item() {
        return this._item;
    }

    set item(obj: visual.Item) {
        this._item = obj;
        this.originalScale = obj.scale.clone();
        this.originalPosition = obj.position.clone();
    }

    update() {
        const { item, origin, p2, p3 } = this;
        item.scale.copy(this.originalScale);
        item.position.copy(this.originalPosition);

        const oldLength = p2.clone().sub(origin).length()
        const newLength = p3.clone().sub(origin).length();
        const scaleFactor = (newLength / oldLength);

        item.position.sub(origin);
        item.position.multiplyScalar(scaleFactor);
        item.position.add(origin);
        item.scale.multiplyScalar(scaleFactor);

        return super.update();
    }

    commit() {
        const { item, origin, p2, p3 } = this;
        const solid = this.db.lookup(this.item, c3d.SpaceType.Solid);
        this.db.removeItem(item);

        const oldLength = p2.clone().sub(origin).length()
        const newLength = p3.clone().sub(origin).length();
        const scaleFactor = (newLength / oldLength);

        const names = new c3d.SNameMaker(c3d.CreatorType.TransformedSolid, c3d.ESides.SideNone, 0);
        const params = new c3d.TransformValues(scaleFactor, scaleFactor, scaleFactor, new c3d.CartPoint3D(origin.x, origin.y, origin.z));
        const result = c3d.ActionDirect.TransformedSolid(solid, c3d.CopyMode.KeepHistory, params, names);
        this.db.addItem(result);

        return super.commit();
    }

    cancel() {
        const { item } = this;
        item.scale.copy(this.originalScale);
    }
}