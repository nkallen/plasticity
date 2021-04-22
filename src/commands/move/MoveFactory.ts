import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../../VisualModel';

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

    doUpdate() {
        const originalPosition = this.originalPosition.clone();
        const p1 = this.p1, p2 = this.p2;
        this.item.position.copy(originalPosition.add(p2).sub(p1));
    }

    doCommit() {
        const model = this.db.lookup(this.item);
        this.db.removeItem(this.item);

        const delta = this.p2.clone().sub(this.p1);
        const vec = new c3d.Vector3D(delta.x, delta.y, delta.z);
        model.Move(vec);
        return this.db.addItem(model);
    }

    doCancel() {
        this._item.position.copy(this.originalPosition);
    }
}