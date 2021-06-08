import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../../VisualModel';

export default class MoveFactory extends GeometryFactory {
    _items!: visual.Item[];
    originalPosition = new THREE.Vector3();
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    get items() {
        return this._items;
    }

    set items(objs: visual.Item[]) {
        this._items = objs;
        this.originalPosition.copy(objs[0].position);
    }

    async doUpdate() {
        const p1 = this.p1, p2 = this.p2;
        for (const item of this.items) {
            const originalPosition = this.originalPosition.clone();
            item.position.copy(originalPosition.add(p2).sub(p1));
        }
    }

    async doCommit() {
        const result = [];
        for (const item of this.items) {
            const model = this.db.lookup(item);

            const delta = this.p2.clone().sub(this.p1);
            const vec = new c3d.Vector3D(delta.x, delta.y, delta.z);
            model.Move(vec);
            result.push(this.db.addItem(model).then(x => { this.db.removeItem(item); return x }));
        }
        return Promise.all(result);
    }

    doCancel() {
        for (const item of this.items) {
            item.position.copy(this.originalPosition);
        }
    }
}