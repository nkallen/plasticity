import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../editor/EditorSignals';
import { GeometryDatabase } from '../../editor/GeometryDatabase';
import MaterialDatabase from '../../editor/MaterialDatabase';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export interface ChamferParams {
    item: visual.Solid;
    edges: visual.CurveEdge[];
    distance: number;
    distance1: number;
    distance2: number;
    begLength: number;
    endLength: number;
    form: c3d.SmoothForm;
    prolong: boolean;
    smoothCorner: c3d.CornerForm;
}

export default class ChamferFactory extends GeometryFactory implements ChamferParams {

    private solid!: c3d.Solid;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);

        const params = new c3d.SmoothValues();
        params.distance1 = 0;
        params.distance2 = 0;
        params.form = c3d.SmoothForm.Slant1;
        params.prolong = false;
        params.smoothCorner = 2;
        this.params = params;
    }

    params: c3d.SmoothValues;

    private _item!: visual.Solid;
    get item(): visual.Solid { return this._item }
    set item(item: visual.Solid) {
        this._item = item;
        this.solid = this.db.lookup(this.item);
    }

    private models: c3d.CurveEdge[] = [];
    private _edges!: visual.CurveEdge[];
    get edges() { return this._edges }
    set edges(edges: visual.CurveEdge[]) {
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge) as c3d.CurveEdge;
            this.models.push(model);
        }
        this._edges = edges;
    }

    get distance1() { return this.params.distance1 }
    set distance1(d: number) { this.params.distance1 = d }
    get distance2() { return this.params.distance2 }
    set distance2(d: number) { this.params.distance2 = d }
    get form() { return this.params.form }
    set form(d: number) { this.params.form = d }
    get prolong() { return this.params.prolong }
    set prolong(d: boolean) { this.params.prolong = d }
    get smoothCorner() { return this.params.smoothCorner }
    set smoothCorner(d: c3d.CornerForm) { this.params.smoothCorner = d }
    get begLength() { return this.params.begLength }
    set begLength(d: number) { this.params.begLength = d }
    get endLength() { return this.params.endLength }
    set endLength(d: number) { this.params.endLength = d }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);

    protected async computeGeometry() {
        return c3d.ActionSolid.ChamferSolid_async(this.solid, c3d.CopyMode.Copy, this.models, this.params, this.names);
    }
    get originalItem() { return this.item }
}
