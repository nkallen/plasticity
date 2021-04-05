import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../VisualModel';

export default class RotateFactory extends GeometryFactory {
    _item!: visual.Item;
    originalQuaternion = new THREE.Quaternion();
    point!: THREE.Vector3
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
        const { item, axis, angle, point } = this;
        const model = this.db.lookupItem(item);
        this.db.removeItem(item);

        const p = new c3d.CartPoint3D(point.x, point.y, point.z);
        const v = new c3d.Vector3D(axis.x, axis.y, axis.z);
        const axi = new c3d.Axis3D(p, v);
        model.Rotate(axi, angle);
        this.db.addItem(model);

        return super.commit();
    }

    cancel() {
        this._item.quaternion.copy(this.originalQuaternion);
    }
}