import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export default class UnionFactory extends GeometryFactory {
    object1!: THREE.Object3D;
    object2!: THREE.Object3D;

    commit() {
        this.editor.removeObject(this.object1);
        this.editor.removeObject(this.object2);

        let model1 = this.editor.lookup(this.object1);
        let model2 = this.editor.lookup(this.object2);

        if (model1.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";
        if (model2.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";

        model1 = model1.Cast<c3d.Solid>(c3d.SpaceType.Solid);
        model2 = model2.Cast<c3d.Solid>(c3d.SpaceType.Solid);

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