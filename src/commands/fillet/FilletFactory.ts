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
        const result = await c3d.ActionSolid.FilletSolid_async(this.solid, c3d.CopyMode.Copy, this.curves, [], this.params, this.names);
        const temp = await this.db.addTemporaryItem(result);
        this.item.visible = false;
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const filletted = c3d.ActionSolid.FilletSolid(this.solid, c3d.CopyMode.Copy, this.curves, [], this.params, this.names);
        const result = await this.db.addItem(filletted);
        this.db.removeItem(this.item);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        this.item.visible = true;
        this.temp?.cancel();
    }

    async check(d: number) {
        const params = new c3d.SmoothValues();
        params.distance1 = d;
        params.distance2 = d;
        params.form = 0;
        params.conic = 0;
        params.prolong = false;
        params.smoothCorner = 2;
        params.keepCant = -1;
        params.strict = true;

        await c3d.ActionSolid.FilletSolid_async(this.solid, c3d.CopyMode.Copy, this.curves, [], params, this.names);
    }
}

/**
 * The following class "clamps" fillets to a max
 */
type State = { tag: 'start' } | { tag: 'finding' } | { tag: 'found', value: number } | { tag: 'computed', value: number }

export class Max {
    private state: State = { tag: 'start' }

    constructor(
        private readonly factory: FilletFactory
    ) { }

    async start() {
        switch (this.state.tag) {
            case 'start':
                this.state = { tag: 'finding' }
                console.time("searching");
                const result = await Max.search(0.01, 0.1, 100, (d) => this.factory.check(d));
                console.timeEnd("searching");
                this.state = { tag: 'found', value: result }
                break;
            default: throw new Error("invalid state");
        }
    }

    async exec(delta: number) {
        const factory = this.factory;
        switch (this.state.tag) {
            case 'start':
            case 'finding':
                factory.distance = delta;
                factory.schedule(async () => {
                    await factory.transaction('distance', async () => {
                        await factory.update();
                    });
                });
                break;
            case 'found':
                const max = this.state.value;
                if (delta >= max) {
                    factory.distance = max;
                    factory.schedule(async () => {
                        await factory.transaction('distance', async () => {
                            await factory.update();
                            this.state = { tag: 'computed', value: max }
                        });
                    });
                } else {
                    factory.distance = delta;
                    factory.schedule(async () => {
                        await factory.transaction('distance', async () => {
                            await factory.update();
                        });
                    });
                }
                break;
            case 'computed':
                if (delta >= this.state.value) {
                    console.warn("skipping work because delta exceeds max");
                } else {
                    this.state = { tag: 'found', value: this.state.value }
                    await this.exec(delta);
                }
                break;
        }
    }

    static async search<_>(lastGood: number, candidate: number, max: number, cb: (n: number) => Promise<_>): Promise<number> {
        if (max < candidate) throw new Error('invalid');
        if (candidate < lastGood) throw new Error('invalid');
        if (Math.abs(candidate - lastGood) < 0.01) return Promise.resolve(lastGood);

        try {
            await cb(candidate);
            return this.search(candidate, candidate + (max - candidate) / 2, max, cb);
        } catch (e) {
            return this.search(lastGood, lastGood + (candidate - lastGood) / 2, candidate, cb);
        }
    }
}