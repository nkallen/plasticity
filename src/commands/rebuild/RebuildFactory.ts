import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    item!: visual.Item;

    async computeGeometry() {
        const { dup } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);
        return dup;
    }

    get originalItem() {
        return this.item;
    }
}