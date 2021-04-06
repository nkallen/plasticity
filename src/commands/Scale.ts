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

    get item() {
        return this._item;
    }

    set item(obj: visual.Item) {
        this._item = obj;
        this.originalScale = obj.scale.clone();
    }

    update() {
        const { item, origin, p2, p3 } = this;
        item.scale.copy(this.originalScale);

        const oldLength = p2.clone().sub(origin).length()
        const newLength = p3.clone().sub(origin).length();
        const scaleFactor = (newLength/oldLength);
        item.scale.multiplyScalar(scaleFactor);

        return super.update();
    }

    commit() {
        return super.commit();
    }

    cancel() {
        const { item } = this;
        item.scale.copy(this.originalScale);
    }
}