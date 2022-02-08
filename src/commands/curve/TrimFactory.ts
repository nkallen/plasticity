import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { inst2curve } from '../../util/Conversion';
import { GeometryFactory } from '../../command/GeometryFactory';
import { Interval } from './Interval';

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
        const originals = new Set<visual.SpaceInstance<visual.Curve3D>>();
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
        for (const [inst, fragment] of infos) {
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
        const allPoints = polyline.GetPoints();
        const result = [];
        for (const { start, stop } of infos) {
            const startPoint = polyline.PointOn(start);
            const stopPoint = polyline.PointOn(stop);

            const ts = [...Array(allPoints.length).keys()];

            if (polyline.IsClosed()) {
                const vertices = [];
                if (start === stop) throw new Error("invalid precondition");
                for (let i = Math.ceil(stop); i != Math.floor(start); i = (i + 1) % ts.length) {
                    vertices.push(i);
                }
                if (stop !== Math.ceil(stop)) vertices.unshift(stop);
                vertices.push(Math.floor(start));
                if (start !== Math.floor(start)) vertices.push(start);
                const points = vertices.map(t => curve.PointOn(t));
                const line = new c3d.Polyline3D(points, false);
                result.push(new c3d.SpaceInstance(line));
            } else {
                const first = ts.filter(p => p < start);
                if (first.length > 0) {
                    const points = first.map(t => allPoints[t]);
                    points.push(startPoint);
                    const line = c3d.ActionCurve3D.SplineCurve(points, false, c3d.SpaceType.Polyline3D);
                    result.push(new c3d.SpaceInstance(line));
                }

                const second = ts.filter(p => p > stop);
                if (second.length > 0) {
                    const points = second.map(t => allPoints[t]);
                    points.unshift(stopPoint);
                    const line = c3d.ActionCurve3D.SplineCurve(points, false, c3d.SpaceType.Polyline3D);
                    result.push(new c3d.SpaceInstance(line));
                }
            }
        }
        return result;
    }

    private async trimGeneral(fragment: Fragment) {
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

