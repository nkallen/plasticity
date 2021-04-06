import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import { Item } from '../VisualModel';

export default class IntersectionFactory extends GeometryFactory {
    item1!: Item;
    item2!: Item;

    commit() {
        let model1 = this.db.lookup(this.item1, c3d.SpaceType.Solid);
        let model2 = this.db.lookup(this.item2, c3d.SpaceType.Solid);

        const names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);

        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(true);
        flags.SetMergingEdges(true);

        const result = c3d.ActionSolid.BooleanResult(model1, c3d.CopyMode.KeepHistory, model2, c3d.CopyMode.KeepHistory, c3d.OperationType.Intersect, flags, names);

        this.db.removeItem(this.item1);
        this.db.removeItem(this.item2);

        this.db.addItem(result);

        return super.commit();
    }

    cancel() {
    }
}