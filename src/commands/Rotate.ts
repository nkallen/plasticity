import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../VisualModel';

export default class RotateFactory extends GeometryFactory {
    _item!: visual.Item;
    originalQuaternion = new THREE.Quaternion();
    axis!: THREE.Vector3;
    angle!: number;

    get item() {
        return this._item;
    }

    set item(obj: visual.Item) {
        this._item = obj;
        this.originalQuaternion.copy(obj.quaternion);
    }

    update() {
        const { item, axis, angle } = this;
        item.quaternion.multiplyQuaternions(this.originalQuaternion,
            new THREE.Quaternion(axis.x, axis.y, axis.z, angle));
        
        return super.update();
    }

    commit() {
        const { item, axis, angle } = this;
        const model = this.db.lookupItem(item);
        this.db.removeItem(item);

        const v = new c3d.Vector3D(axis.x, axis.y, axis.z);
        model.Rotate(new c3d.Axis3D(v), angle);
        this.db.addItem(model);

        return super.commit();
    }

    cancel() {
        this._item.quaternion.copy(this.originalQuaternion);
    }
}