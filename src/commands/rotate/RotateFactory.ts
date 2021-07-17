import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class RotateFactory extends GeometryFactory {
    _items!: visual.Item[];
    originalQuaternion = new THREE.Quaternion();
    originalPosition = new THREE.Vector3();
    point!: THREE.Vector3
    axis!: THREE.Vector3;
    angle!: number;

    get items() {
        return this._items;
    }

    set items(objs: visual.Item[]) {
        this._items = objs;
        this.originalQuaternion.copy(objs[0].quaternion);
        this.originalPosition.copy(objs[0].position);
    }

    async doUpdate() {
        const { items, point, axis, angle } = this;
        for (const item of items) {
            item.position.copy(this.originalPosition);

            item.position.sub(point);
            item.position.applyAxisAngle(axis, angle);
            item.position.add(point);
            item.quaternion.setFromAxisAngle(axis, angle);
        }
    }

    async doCommit() {
        const result = [];
        const { items, axis, angle, point } = this;
        for (const item of items) {
            const model = this.db.lookup(item);

            const p = new c3d.CartPoint3D(point.x, point.y, point.z);
            const v = new c3d.Vector3D(axis.x, axis.y, axis.z);
            const axi = new c3d.Axis3D(p, v);
            model.Rotate(axi, angle);
            this.db.removeItem(item);
            result.push(this.db.addItem(model));
        }
        return Promise.all(result);
    }

    doCancel() {
        for (const item of this.items) {
            item.quaternion.copy(this.originalQuaternion);
        }
    }
}