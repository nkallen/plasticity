import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    item!: visual.Item;

    async doUpdate() {
        const { dup, item } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);

        const temp = await this.db.addTemporaryItem(dup);

        this.db.hide(item);
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { dup } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);

        const result = await this.db.addItem(dup);
        this.db.removeItem(this.item);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        this.db.unhide(this.item);
        this.temp?.cancel();
    }
}