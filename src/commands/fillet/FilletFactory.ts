import c3d from '../../../build/Release/c3d.node';
import { delegate, derive } from '../../command/FactoryBuilder';
import { GeometryFactory, GeometryFactoryCache, NoOpError, PhantomInfo } from '../../command/GeometryFactory';
import { groupBy, MultiGeometryFactory } from '../../command/MultiFactory';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from '../../editor/EditorSignals';
import { copyduplicate } from '../../editor/GeometryDatabase';
import MaterialDatabase from '../../editor/MaterialDatabase';
import { composeMainName, deunit, truncunit, unit } from '../../util/Conversion';
import { AtomicRef } from '../../util/Util';
import * as visual from '../../visual_model/VisualModel';
import { FunctionWrapper } from './FunctionWrapper';

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

    edgeFunctions!: c3d.EdgeFunction[];
    curveEdges!: c3d.CurveEdge[];
    functions!: Map<string, FunctionWrapper>;

    constructor(db: DatabaseLike, materials: MaterialDatabase, signals: EditorSignals, cache?: GeometryFactoryCache) {
        super(db, materials, signals, cache);

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

    protected _solid!: { view: visual.Solid, model: c3d.Solid };
    @derive(visual.Solid) get solid(): visual.Solid { throw '' }
    set solid(solid: visual.Solid | c3d.Solid) { }

    private _edges!: visual.CurveEdge[];
    private indices!: { functions: c3d.Function[], slideways: c3d.Curve3D[], indexes: c3d.EdgeFacesIndexes[] }
    get edges() { return this._edges }
    set edges(edges: visual.CurveEdge[]) {
        const edgeFunctions = [];
        const curveEdges = [];
        const name2function = new Map<string, FunctionWrapper>();
        const names = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge) as c3d.CurveEdge;
            curveEdges.push(model);
            names.push(edge.simpleName);
        }
        for (const [i, edge] of curveEdges.entries()) {
            const fn = new FunctionWrapper(new c3d.CubicFunction(1, 1));
            const simpleName = names[i];
            name2function.set(simpleName, fn);
            edgeFunctions.push(new c3d.EdgeFunction(edge, fn.underlying));
        }
        const { _solid: { model: solid } } = this;
        const shell = solid.GetShell()!;
        this.indices = shell.FindFacesIndexByEdges(edgeFunctions);
        this.edgeFunctions = edgeFunctions;
        this.curveEdges = curveEdges;
        this.functions = name2function;
        this._edges = edges;
    }

    get distance() { return deunit(this.params.distance1) }
    set distance(d: number) {
        const { params } = this;
        params.distance1 = truncunit(d, 3);
        params.distance2 = truncunit(d, 3);
    }

    get distance1() { return deunit(this.params.distance1) }
    set distance1(d: number) { this.params.distance1 = truncunit(d, 3) }
    get distance2() { return deunit(this.params.distance2) }
    set distance2(d: number) { this.params.distance2 = truncunit(d, 3) }
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
        const { _solid: { model: solid }, params, indices, names } = this;
        if (this.distance1 === 0 || this.distance2 === 0) throw new NoOpError();

        const { solid: copy, edges, functions, history } = copyduplicate(solid, indices);

        if (this.mode === c3d.CreatorType.ChamferSolid) {
            const result = await c3d.ActionSolid.ChamferSolid_async(copy, c3d.CopyMode.Same, edges, params, this.names);
            this.db.register(result, history);
            return result;
        } else {
            const edgeFunctions = [];
            for (const [i, edge] of edges.entries()) {
                edgeFunctions.push(new c3d.EdgeFunction(edge, indices.functions[i]));
            }
            const result = await c3d.ActionSolid.FilletSolid_async(copy, c3d.CopyMode.Same, edgeFunctions, [], params, names);
            this.db.register(result, history);
            return result;
        }
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        if (this.mode === c3d.CreatorType.ChamferSolid) return [];
        const { _solid: { model: solid }, params } = this;
        const surfaces = await c3d.ActionPhantom.SmoothPhantom_async(solid, this.edgeFunctions, params);
        return surfaces.map(s => ({
            phantom: new c3d.SpaceInstance(s),
            material: {},
        }));
    }

    get originalItem() { return this._solid.view }

    toJSON() {
        const { distance1, distance2, form, conic, prolong, smoothCorner, begLength, endLength, keepCant, strict, functions } = this;
        const fns = [...functions.values()].map(f => f.toJSON());
        return {
            dataType: 'FilletFactory',
            distance1, distance2, form, conic, prolong, smoothCorner, begLength, endLength, keepCant, strict,
            fns
        }
    }

    override get cacheKey() {
        return JSON.stringify(this.toJSON());
    }
}

export class MaxFilletFactory extends GeometryFactory implements FilletParams {
    private searcher = new FilletFactory(this.db, this.materials, this.signals, this.cache);
    private updater = new FilletFactory(this.db, this.materials, this.signals, this.cache);
    readonly factories = [this.searcher, this.updater];

    private max = new Max<c3d.Item | c3d.Item[]>(this.searcher);

    calculate() {
        return this.max.exec(this.distance1, this.distance2, (d1, d2) => {
            this.distance1 = d1; this.distance2 = d2;
            return this.updater.calculate();
        })
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        // return this.updater.calculatePhantoms(); // TODO: this isn't safe, the object needs to be duplicated first
        return [];
    }

    start() { return this.max.start() }

    @dirty @delegate solid!: visual.Solid;
    @dirty @delegate edges!: visual.CurveEdge[];

    @dirty @delegate.default(c3d.SmoothForm.Fillet) form!: c3d.SmoothForm;
    @dirty @delegate.default(0) conic!: number;
    @dirty @delegate.default(true) prolong!: boolean;
    @dirty @delegate.default(c3d.CornerForm.uniform) smoothCorner!: c3d.CornerForm;
    @dirty @delegate.default(c3d.ThreeStates.neutral) keepCant!: c3d.ThreeStates;
    @dirty @delegate.default(false) strict!: boolean;
    @dirty @delegate.default(unit(FilletFactory.LengthSentinel)) begLength!: number;
    @dirty @delegate.default(unit(FilletFactory.LengthSentinel)) endLength!: number;
    @dirty @delegate.default(false) equable!: boolean;

    get distance() { return this.updater.distance }
    set distance(distance: number) {
        const max = this.max.max;
        if (max !== undefined && distance > max) {
            this.searcher.distance = max;
            this.updater.distance = max;
        } else {
            this.searcher.distance = distance;
            this.updater.distance = distance;
        }
    }

    set distance1(distance1: number) { this.searcher.distance1 = distance1; this.updater.distance1 = distance1 }
    get distance1() { return this.updater.distance1 }
    set distance2(distance2: number) { this.searcher.distance2 = distance2; this.updater.distance2 = distance2 }
    get distance2() { return this.updater.distance2 }

    get functions() { return this.updater.functions }
    get mode() { return this.updater.mode }

    get originalItem() { return this.updater.originalItem }
}


function dirty(target: MaxFilletFactory, propertyKey: keyof MaxFilletFactory) {
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey)!;
    const oldSet = descriptor.set!;
    Object.defineProperty(target, propertyKey, {
        get: descriptor.get,
        set(t: any) {
            oldSet.call(this, t);
            this['max'].dirty();
        }
    })
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

    get distance() {
        if (this.factories.length === 0) return 0;
        return this.factories[this.factories.length - 1].distance;
    }
    set distance(d: number) {
        for (const factory of this.factories) factory.distance = d;
    }

    get distance1() {
        if (this.factories.length === 0) return 0;
        return this.factories[this.factories.length - 1].distance1;
    }
    set distance1(d: number) {
        for (const factory of this.factories) factory.distance1 = d;
    }

    get distance2() {
        if (this.factories.length === 0) return 0;
        return this.factories[this.factories.length - 1].distance1;
    }
    set distance2(d: number) {
        for (const factory of this.factories) factory.distance2 = d;
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
            individual.distance1 = this.distance1;
            individual.distance2 = this.distance2;
            // FIXME: need to copy over all current values
            individuals.push(individual);
        }
        this.factories = individuals;
    }

    start() {
        return Promise.all(this.factories.map(f => f.start()));
    }

    get mode(): Mode {
        return this.distance1 < 0 ? c3d.CreatorType.ChamferSolid : c3d.CreatorType.FilletSolid;
    }

    get functions(): MaxFilletFactory['functions'] {
        return this.factories.map(f => f.functions)[this.factories.length - 1];
    }
}

/**
 * The following class "clamps" fillets to a max
 */
type State<T> = { tag: 'start' } | { tag: 'finding' } | { tag: 'found', upperBound: number } | { tag: 'computed', value: number, result: T }

type MaxSearchResult<T> = { tag: 'max', value: number, result: T } | { tag: 'upper-bound', value: number } | { tag: 'no-idea' };

export class Max<T> {
    private state: AtomicRef<State<T>> = new AtomicRef({ tag: 'start' });

    constructor(private readonly factory: FilletFactory) {
    }

    get max() {
        const { value: state } = this.state.get();
        switch (state.tag) {
            case 'found':
                return state.upperBound;
            case 'computed':
                return state.value;
        }
    }

    dirty() {
        this.state.set({ tag: 'start' });
    }

    async start() {
        const get = this.state.get();
        const { value: state } = get;
        let clock: number | undefined = get.clock;
        switch (state.tag) {
            case 'start':
                clock = this.state.compareAndSet(clock, { tag: 'finding' });
                if (clock === undefined) return;
                const factory = this.factory;

                console.time("searching for max fillet");
                const search = await Max.exponential_search(0.01, 100, d => {
                    factory.distance = d;
                    return factory.calculate();
                }, 500);
                console.timeEnd("searching for max fillet");
                console.info(search);

                switch (search.tag) {
                    case 'max':
                        this.state.compareAndSet(clock, { tag: 'computed', value: search.value, result: search.result as unknown as T });
                        return search.value;
                    case 'upper-bound':
                        this.state.compareAndSet(clock, { tag: 'found', upperBound: search.value });
                        return;
                    default:
                        throw new Error('not yet supported')
                }

            default: throw new Error("invalid state");
        }
    }

    async exec(distance1: number, distance2: number, fn: (distance1: number, distance2: number) => Promise<T>): Promise<T> {
        const { value: state, clock } = this.state.get();
        if (Math.abs(distance1 - distance2) > 10e-6) return fn(distance1, distance2);

        switch (state.tag) {
            case 'start':
            case 'finding':
                return fn(distance1, distance2);
            case 'found':
                const max = state.upperBound;
                if (distance1 >= max) {
                    const result = await fn(max, max);
                    this.state.compareAndSet(clock, { tag: 'computed', value: max, result });
                    return result;
                } else {
                    return fn(distance1, distance2);
                }
            case 'computed':
                if (distance1 >= state.value) {
                    console.warn("skipping work because delta exceeds max");
                    return state.result;
                } else {
                    return fn(distance1, distance2);
                }
        }
    }

    static async exponential_search<T>(begin: number, max: number, cb: (n: number) => Promise<T>, budget: number): Promise<MaxSearchResult<T>> {
        const start = performance.now();

        let lastGood = begin;
        let lastResult: T | undefined = undefined;
        while (begin < max) {
            const end = performance.now();
            const tdelta = end - start;
            if (tdelta > budget) return { tag: 'upper-bound', value: max }

            try {
                lastResult = await cb(begin);
                lastGood = begin;
                begin *= 2;
            } catch (e) {
                break;
            }
        }
        const upperBound = begin;
        const end = performance.now();
        const tdelta = end - start;
        budget -= tdelta;
        const range = upperBound - lastGood;

        return this.binary_search(lastGood, lastResult, lastGood + range / 2, upperBound, cb, budget);
    }

    static async binary_search<T>(lastGood: number, result: T | undefined, candidate: number, max: number, cb: (n: number) => Promise<T>, budget: number): Promise<MaxSearchResult<T>> {
        if (max < candidate) throw new Error('invalid');
        if (candidate < lastGood) throw new Error('invalid');
        if (Math.abs(candidate - lastGood) < Math.max(0.01, candidate / 100)) return { tag: 'max', value: lastGood, result: result! };
        if (budget <= 0) return { tag: 'upper-bound', value: max }

        const start = performance.now();
        try {
            const result = await cb(candidate);
            const end = performance.now();
            const tdelta = end - start;
            return this.binary_search(candidate, result, candidate + (max - candidate) / 2, max, cb, budget - tdelta);
        } catch (e) {
            const end = performance.now();
            const tdelta = end - start;
            return this.binary_search(lastGood, result, lastGood + (candidate - lastGood) / 2, candidate, cb, budget - tdelta);
        }
    }
}
