import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../VisualModel';
import { TemporaryObject } from '../../GeometryDatabase';

export default class FilletFactory extends GeometryFactory {
    private _item!: visual.Solid;
    private _edges!: visual.CurveEdge[];

    private solid!: c3d.Solid;
    private curves!: c3d.CurveEdge[];
    private params!: c3d.SmoothValues;
    private temp?: TemporaryObject;

    get item(): visual.Solid {
        return this._item;
    }

    set item(item: visual.Solid) {
        this._item = item;
        this.solid = this.db.lookup(this.item);
    }

    get edges(): visual.CurveEdge[] {
        return this._edges;
    }

    // FIXME the naming edges/curves is confusing
    set edges(edges: visual.CurveEdge[]) {
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

    get distance(): number {
        return this.params.distance1;
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);

    async doUpdate() {
        this.item.visible = false;

        const result = await c3d.ActionSolid.FilletSolid_async(this.solid, c3d.CopyMode.Copy, this.curves, [], this.params, this.names);
        this.temp?.cancel();
        this.temp = this.db.addTemporaryItem(result);
    }

    async doCommit() {
        if (this.temp) return this.temp.commit();

        const result = c3d.ActionSolid.FilletSolid(this.solid, c3d.CopyMode.Copy, this.curves, [], this.params, this.names);
        this.db.removeItem(this.item);
        return this.db.addItem(result);
    }

    doCancel() {
        this.item.visible = true;
        this.temp?.cancel();
    }
}