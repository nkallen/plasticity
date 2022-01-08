import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../editor/EditorSignals';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import MaterialDatabase from '../../editor/MaterialDatabase';
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, deunit, unit } from '../../util/Conversion';
import { GeometryFactory, NoOpError } from '../../command/GeometryFactory';
import { delegate } from '../../command/FactoryBuilder';
import { groupBy, MultiGeometryFactory } from '../../command/MultiFactory';

export interface FilletParams {
    edges: visual.CurveEdge[];
    distance: number;
    distance1: number;
    distance2: number;
    begLength: number;
    endLength: number;
    equable: boolean;
    form: c3d.SmoothForm;
    conic: number;
    prolong: boolean;
    smoothCorner: c3d.CornerForm;
    keepCant: c3d.ThreeStates;
    strict: boolean;
}

export type Mode = c3d.CreatorType.FilletSolid | c3d.CreatorType.ChamferSolid;

export default class FilletFactory extends GeometryFactory implements FilletParams {
    static LengthSentinel = deunit(-1e300);

    private _solid!: visual.Solid;
    private _edges!: visual.CurveEdge[];

    private model!: c3d.Solid;
    edgeFunctions!: c3d.EdgeFunction[];
    curveEdges!: c3d.CurveEdge[];
    functions!: Map<string, c3d.CubicFunction>;

    constructor(db: DatabaseLike, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);

        const params = new c3d.SmoothValues();
        params.distance1 = 0;
        params.distance2 = 0;
        params.form = c3d.SmoothForm.Fillet;
        params.conic = 0;
        params.prolong = true;
        params.smoothCorner = c3d.CornerForm.uniform;
        params.begLength = unit(FilletFactory.LengthSentinel);
        params.endLength = unit(FilletFactory.LengthSentinel);
        params.keepCant = c3d.ThreeStates.neutral;
        params.strict = false;

        this.params = params;
    }

    params: c3d.SmoothValues;

    get solid(): visual.Solid {
        return this._solid;
    }

    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    get edges() { return this._edges }
    set edges(edges: visual.CurveEdge[]) {
        const edgeFunctions = [];
        const curveEdges = [];
        const name2function = new Map<string, c3d.CubicFunction>();
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge) as c3d.CurveEdge;
            curveEdges.push(model);
            const fn = new c3d.CubicFunction(1, 1);
            name2function.set(edge.simpleName, fn);
            edgeFunctions.push(new c3d.EdgeFunction(model, fn));
        }
        this.edgeFunctions = edgeFunctions;
        this.curveEdges = curveEdges;
        this.functions = name2function;
        this._edges = edges;
    }

    get distance() { return deunit(this.params.distance1) }
    set distance(d: number) {
        const { params } = this;
        params.distance1 = unit(d);
        params.distance2 = unit(d);
    }

    get distance1() { return deunit(this.params.distance1) }
    set distance1(d: number) { this.params.distance1 = unit(d) }
    get distance2() { return deunit(this.params.distance2) }
    set distance2(d: number) { this.params.distance2 = unit(d) }
    get form() { return this.params.form }
    set form(d: c3d.SmoothForm) { this.params.form = d }
    get conic() { return this.params.conic }
    set conic(d: number) { this.params.conic = d }
    get prolong() { return this.params.prolong }
    set prolong(d: boolean) { this.params.prolong = d }
    get smoothCorner() { return this.params.smoothCorner }
    set smoothCorner(d: c3d.CornerForm) { this.params.smoothCorner = d }
    get keepCant() { return this.params.keepCant }
    set keepCant(d: c3d.ThreeStates) { this.params.keepCant = d }
    get strict() { return this.params.strict }
    set strict(d: boolean) { this.params.strict = d }
    get begLength() { return deunit(this.params.begLength) }
    set begLength(d: number) { this.params.begLength = unit(d) }
    get endLength() { return deunit(this.params.endLength) }
    set endLength(d: number) { this.params.endLength = unit(d) }
    get equable() { return this.params.equable }
    set equable(d: boolean) { this.params.equable = d }

    private get names() {
        return new c3d.SNameMaker(composeMainName(this.mode, this.db.version), c3d.ESides.SideNone, 0);
    }

    get mode(): Mode {
        return this.params.distance1 < 0 ? c3d.CreatorType.ChamferSolid : c3d.CreatorType.FilletSolid;
    }

    async calculate() {
        if (this.distance1 === 0 || this.distance2 === 0) throw new NoOpError();

        if (this.mode === c3d.CreatorType.ChamferSolid) {
            return c3d.ActionSolid.ChamferSolid_async(this.model, c3d.CopyMode.Copy, this.curveEdges, this.params, this.names);
        } else {
            return c3d.ActionSolid.FilletSolid_async(this.model, c3d.CopyMode.Copy, this.edgeFunctions, [], this.params, this.names);
        }
    }

    get originalItem() { return this.solid }
}

export class MaxFilletFactory extends GeometryFactory implements FilletParams {
    private searcher = new FilletFactory(this.db, this.materials, this.signals);
    private updater = new FilletFactory(this.db, this.materials, this.signals);
    readonly factories = [this.searcher, this.updater];

    private max = new Max<c3d.Solid>(this.searcher);

    calculate() {
        return this.max.exec(this.distance1, d => {
            this.distance1 = d;
            return this.updater.calculate();
        })
    }

    start() { 
        return this.max.start() 
    }

    @delegate solid!: visual.Solid;
    @delegate edges!: visual.CurveEdge[];

    @delegate.default(0) distance2!: number;
    @delegate.default(c3d.SmoothForm.Fillet) form!: c3d.SmoothForm;
    @delegate.default(0) conic!: number;
    @delegate.default(true) prolong!: boolean;
    @delegate.default(c3d.CornerForm.uniform) smoothCorner!: c3d.CornerForm;
    @delegate.default(c3d.ThreeStates.neutral) keepCant!: c3d.ThreeStates;
    @delegate.default(false) strict!: boolean;
    @delegate.default(unit(FilletFactory.LengthSentinel)) begLength!: number;
    @delegate.default(unit(FilletFactory.LengthSentinel)) endLength!: number;
    @delegate.default(false) equable!: boolean;

    get distance() { return this.updater.distance }
    set distance(distance: number) { this.searcher.distance = distance; this.updater.distance = distance }

    set distance1(distance1: number) { this.searcher.distance1 = distance1; this.updater.distance1 = distance1 }
    get distance1() { return this.updater.distance1 }

    get functions() { return this.updater.functions }
    get mode() { return this.updater.mode }

    get originalItem() { return this.updater.originalItem }
}

export class MultiFilletFactory extends MultiGeometryFactory<MaxFilletFactory> implements FilletParams {
    @delegate.default(c3d.SmoothForm.Fillet) form!: c3d.SmoothForm;
    @delegate.default(0) conic!: number;
    @delegate.default(true) prolong!: boolean;
    @delegate.default(c3d.CornerForm.uniform) smoothCorner!: c3d.CornerForm;
    @delegate.default(c3d.ThreeStates.neutral) keepCant!: c3d.ThreeStates;
    @delegate.default(false) strict!: boolean;
    @delegate.default(FilletFactory.LengthSentinel) begLength!: number;
    @delegate.default(FilletFactory.LengthSentinel) endLength!: number;
    @delegate.default(false) equable!: boolean;
    
    @delegate.default(0) distance1!: number;
    @delegate.default(0) distance2!: number;

    set distance(d: number) {
        this.distance1 = this.distance2 = d;
    }

    private _edges!: visual.CurveEdge[];
    @delegate.update
    get edges() { return this._edges }
    set edges(edges: visual.CurveEdge[]) {
        for (const factory of this.factories) factory.cancel();
        this._edges = edges;
        const individuals = [];
        const map = groupBy('parentItem', edges);
        for (const [solid, edges] of map.entries()) {
            const individual = new MaxFilletFactory(this.db, this.materials, this.signals);
            individual.solid = solid;
            individual.edges = edges;
            individuals.push(individual);
        }
        this.factories = individuals;
    }

    start() {
        this.factories.forEach(f => f.start());
    }

    get mode(): Mode {
        return this.distance1 < 0 ? c3d.CreatorType.ChamferSolid : c3d.CreatorType.FilletSolid;
    }

    get functions(): FilletFactory['functions'] {
        return this.factories.map(f => f.functions)[this.factories.length - 1];
    }
}

/**
 * The following class "clamps" fillets to a max
 */
type State<T> = { tag: 'start' } | { tag: 'finding' } | { tag: 'found', value: number } | { tag: 'computed', value: number, result: T }

export class Max<T> {
    private state: State<T> = { tag: 'start' }

    constructor(
        private readonly factory: FilletFactory,
    ) { }

    async start() {
        switch (this.state.tag) {
            case 'start':
                this.state = { tag: 'finding' }
                const factory = this.factory;

                console.time("searching for max fillet");
                const result = await Max.search(0.01, 0.1, 100, d => {
                    factory.distance = d;
                    return factory.calculate();
                }, 1000);
                console.timeEnd("searching for max fillet");

                this.state = { tag: 'found', value: result }
                return result;
            default: throw new Error("invalid state");
        }
    }

    async exec(delta: number, fn: (max: number) => Promise<T>): Promise<T> {
        switch (this.state.tag) {
            case 'start':
            case 'finding':
                return fn(delta);
            case 'found':
                const max = this.state.value;
                if (delta >= max) {
                    const result = await fn(max);
                    this.state = { tag: 'computed', value: max, result }
                    return result;
                } else {
                    return fn(delta);
                }
            case 'computed':
                if (delta >= this.state.value) {
                    console.warn("skipping work because delta exceeds max");
                    return this.state.result;
                } else {
                    this.state = { tag: 'found', value: this.state.value }
                    return await this.exec(delta, fn);
                }
                break;
        }
    }

    static async search<_>(lastGood: number, candidate: number, max: number, cb: (n: number) => Promise<_>, budget: number): Promise<number> {
        if (max < candidate) throw new Error('invalid');
        if (candidate < lastGood) throw new Error('invalid');
        if (Math.abs(candidate - lastGood) < candidate / 100) return Promise.resolve(lastGood);
        if (budget <= 0) return max;

        const start = performance.now();
        try {
            await cb(candidate);
            const end = performance.now();
            const tdelta = end - start;
            return this.search(candidate, candidate + (max - candidate) / 2, max, cb, budget - tdelta);
        } catch (e) {
            const end = performance.now();
            const tdelta = end - start;
            return this.search(lastGood, lastGood + (candidate - lastGood) / 2, candidate, cb, budget - tdelta);
        }
    }
}
