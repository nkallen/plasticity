import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../VisualModel';

export default class MoveFactory extends GeometryFactory {
    _item!: visual.Item;
    originalPosition = new THREE.Vector3();
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    get item() {
        return this._item;
    }

    set item(obj: visual.Item) {
        this._item = obj;
        this.originalPosition.copy(obj.position);
    }

    update() {
        const originalPosition = this.originalPosition.clone();
        const p1 = this.p1, p2 = this.p2;
        this.item.position.copy(originalPosition.add(p2).sub(p1));

        return super.update();
    }

    commit() {
        const model = this.db.lookupItem(this.item);
        this.db.removeItem(this.item);

        const delta = this.p2.clone().sub(this.p1);
        const vec = new c3d.Vector3D(delta.x, delta.y, delta.z);
        model.Move(vec);
        this.db.addItem(model);

        return super.commit();
    }

    cancel() {
        this._item.position.copy(this.originalPosition);
    }
}