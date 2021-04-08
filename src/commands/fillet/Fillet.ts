import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../VisualModel';
import { TemporaryObject } from '../../GeometryDatabase';

export default class FilletFactory extends GeometryFactory {
    _item!: visual.Solid;
    _edges!: visual.CurveEdge[];
    _distance!: number;

    private solid!: c3d.Solid;
    private curves!: c3d.CurveEdge[];
    private params!: c3d.SmoothValues;
    private temp?: TemporaryObject;

    get item() {
        return this._item;
    }

    set item(item: visual.Solid) {
        this._item = item;
        this.solid = this.db.lookup(this.item);
    }

    get edges() {
        return this._edges;
    }

    // FIXME the naming edges/curves is confusing
    set edges(edges) {
        this._edges = edges;

        const curves = [];
        for (const edge of edges) {
            curves.push(this.db.lookupTopologyItem(edge) as c3d.CurveEdge);
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

    get distance() {
        return this.params.distance1;
    }

    update() {
        this.item.visible = false;

        const phantom = c3d.ActionPhantom.SmoothPhantom(this.solid, this.curves, this.params);
        this.temp?.cancel();
        this.temp = this.db.addTemporaryItems(phantom.map(ph => new c3d.SpaceInstance(ph)));

        return super.update();
    }

    commit() {
        const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);
        const result = c3d.ActionSolid.FilletSolid(this.solid, c3d.CopyMode.KeepHistory, this.curves, [], this.params, names);
        this.db.removeItem(this.item);
        this.temp!.cancel();
        this.db.addItem(result);

        return super.commit();
    }

    cancel() {
        this.db.scene.add(this.item);
    }
}