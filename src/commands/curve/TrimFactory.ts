import * as c3d from '../../kernel/kernel';
import { GeometryFactory } from '../../command/GeometryFactory';
import { inst2curve } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { Interval, IntervalWithPoints } from './Interval';

interface Fragment {
    infos: visual.FragmentInfo[];
    curve: c3d.Curve3D;
}

export default class TrimFactory extends GeometryFactory {
    set fragment(fragment: visual.SpaceInstance<visual.Curve3D>) {
        this.fragments = [fragment];
    }

    private infos: Map<visual.SpaceInstance<visual.Curve3D>, Fragment> = new Map();
    private _originals: visual.SpaceInstance<visual.Curve3D>[] = [];
    set fragments(fragments: visual.SpaceInstance<visual.Curve3D>[]) {
        const result = new Map<visual.SpaceInstance<visual.Curve3D>, Fragment>();
        for (const fragment of fragments) {
            const fragmentInfo = fragment.underlying.fragmentInfo;
            if (fragmentInfo === undefined) throw new Error("invalid precondition");
            const untrimmed = fragmentInfo.untrimmedAncestor;
            const model = this.db.lookup(untrimmed);
            const curve = inst2curve(model)!;
            if (!result.has(untrimmed)) {
                result.set(untrimmed, { infos: [], curve });
            }
            const info = result.get(untrimmed)!;
            info.infos.push(fragmentInfo);
        }
        this._originals = [...result.keys()];
        this.infos = result;
    }

    cut(inst: visual.SpaceInstance<visual.Curve3D>, start: number, stop: number) {
        const model = this.db.lookup(inst);
        const curve = inst2curve(model)!;
        this._originals.push(inst);
        this.infos = new Map();
        this.infos.set(inst, { curve, infos: [{ start, stop, untrimmedAncestor: inst }] });
    }
    
    async calculate() {
        const { infos } = this;

        const results = [];
        for (const [_, fragment] of infos) {
            const { infos } = fragment;
            if (infos.length === 1) { // FIXME: need more robust
                const { start, stop } = infos[0];
                if (start === -1 && stop === -1) continue;
            }

            if (fragment.curve.IsA() === c3d.SpaceType.Polyline3D) {
                results.push(this.trimPolyline(fragment));
            } else {
                results.push(this.trimGeneral(fragment));
            }
        }
        return (await Promise.all(results)).flat();
    }

    private async trimPolyline(fragment: Fragment) {
        const { curve, infos } = fragment;
        const polyline = curve.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);

        const interval = polyline2interval(polyline);
        const keep = interval.multitrim(infos.map(({ start, stop }) => [start, stop]));
        const result = [];
        for (const i of keep) {
            const points = [];
            points.push(curve.PointOn(i.start));
            for (const t of i.ts) {
                points.push(curve.PointOn(t));
            }
            points.push(curve.PointOn(i.end));
            result.push(new c3d.Polyline3D(points, false));
        }
        return result.map(c => new c3d.SpaceInstance(c));
    }

    private async trimGeneral(fragment: Fragment): Promise<c3d.SpaceInstance[]> {
        const { curve, infos } = fragment;

        const interval = curve2interval(curve);
        const keep = interval.multitrim(infos.map(({ start, stop }) => [start, stop]));
        const curves = keep.map(k => curve.Trimmed(k.start, k.end, 1)!);
        return curves.map(c => new c3d.SpaceInstance(c));
    }

    get originalItem() { return this._originals }
}

function curve2interval(curve: c3d.Curve3D) {
    const start = curve.GetTMin();
    const end = curve.GetTMax();
    const cyclic = curve.IsPeriodic();
    return new Interval(start, end, cyclic);
}

function polyline2interval(curve: c3d.Polyline3D) {
    const start = curve.GetTMin();
    const end = curve.GetTMax();
    const cyclic = curve.IsPeriodic();
    const ts: number[] = [];
    for (let i = Math.floor(start); i < end; i++) {
        if (i > start && i < end) ts.push(i);
    }
    return new IntervalWithPoints(start, end, ts, cyclic);
}


