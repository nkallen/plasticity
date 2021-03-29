import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export default class MoveFactory extends GeometryFactory {
    _object!: THREE.Object3D;
    originalPosition = new THREE.Vector3();
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    get object() {
        return this._object;
    }

    set object(obj: THREE.Object3D) {
        this._object = obj;
        this.originalPosition.copy(obj.position);
    }

    update() {
        const originalPosition = this.originalPosition.clone();
        const p1 = this.p1, p2 = this.p2;
        this.object.position.copy(originalPosition.add(p2).sub(p1));

        return super.update();
    }

    commit() {
        this.editor.scene.remove(this.object);
        const model = this.editor.lookup(this.object);

        const delta = this.p2.clone().sub(this.p1);
        const vec = new c3d.Vector3D(delta.x, delta.y, delta.z);
        model.Move(vec);
        this.editor.addObject(model);
    }

    cancel() {
        this._object.position.copy(this.originalPosition);
    }
}