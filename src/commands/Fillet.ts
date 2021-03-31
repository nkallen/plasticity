import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import { Item, CurveEdge } from '../VisualModel';
import { TemporaryObject } from '../Editor';

export default class FilletFactory extends GeometryFactory {
    _item!: Item;
    _edges!: CurveEdge[];
    _distance!: number;

    private solid!: c3d.Solid;
    private curves!: c3d.CurveEdge[];
    private params!: c3d.SmoothValues;
    private temp?: TemporaryObject;

    get item() {
        return this._item;
    }

    set item(item: Item) {
        this._item = item;

        const lookup = this.editor.lookupItem(this.item);
        if (lookup.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";
        const solid = lookup.Cast<c3d.Solid>(c3d.SpaceType.Solid);
        this.solid = solid;
    }

    get edges() {
        return this._edges;
    }

    set edges(edges) {
        this._edges = edges;

        const curves = [];
        for (const edge of this.edges) {
            curves.push(this.editor.lookupTopologyItem(edge));
        }
        this.curves = curves;
    }

    set distance(d: number) {
        const params = new c3d.SmoothValues();
        params.distance1 = d;
        params.distance2 = d;
        params.form = 0;
        params.conic = 0;
        params.prolong = false;
        params.smoothCorner = 2;
        params.keepCant = -1;
        params.strict = true;
        this.params = params;
    }

    update() {
        this.item.visible = false;
        this.temp?.cancel();

        const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);

        const result = c3d.ActionSolid.FilletSolid(this.solid, c3d.CopyMode.KeepHistory, this.curves, [], this.params, names);
        this.temp = this.editor.addTemporaryObject(result);

        return super.update();
    }

    commit() {
        this.temp!.commit();
        this.editor.removeObject(this.item);
        this.editor.selectionManager.deselectAll();
    }

    cancel() {
        this.editor.scene.add(this.item);
    }
}