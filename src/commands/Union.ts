import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export default class UnionFactory extends GeometryFactory {
    object1!: THREE.Object3D;
    object2!: THREE.Object3D;

    commit() {
        const model1 = this.editor.lookup(this.object1);
        const model2 = this.editor.lookup(this.object2);

        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);

        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(true);
        flags.SetMergingEdges(true);

        const result = c3d.ActionSolid.BooleanResult(model1, c3d.CopyMode.KeepHistory, model2, c3d.CopyMode.KeepHistory, c3d.OperationType.Union, flags, names);
        this.editor.addObject(result);
    }

    cancel() {
    }
}