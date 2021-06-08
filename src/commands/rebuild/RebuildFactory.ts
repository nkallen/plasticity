import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { TemporaryObject } from '../../GeometryDatabase';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export class RebuildFactory extends GeometryFactory {
    dup!: c3d.Item;
    _item!: visual.Item;

    set item(item: visual.Item) {
        this._item = item;
        const { db } = this;
        const model = db.lookup(item);
        // this.dup = model.Duplicate().Cast<c3d.Item>(c3d.SpaceType.Item);
        this.dup = model;
    }

    get item() { return this._item }

    private temp?: TemporaryObject;

    async doUpdate() {
        const { dup, item } = this;

        dup.RebuildItem(c3d.CopyMode.Copy, null);

        const temp = await this.db.addTemporaryItem(dup);

        item.visible = false;
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
        this.temp?.cancel();
    }
}