import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export default class TrimFactory extends GeometryFactory {
    private curve!: c3d.Curve3D;
    private info!: visual.FragmentInfo;

    set fragment(fragment: visual.SpaceInstance<visual.Curve3D>) {
        const info = fragment.underlying.fragmentInfo;
        if (info === undefined) throw new Error("invalid precondition");
        this.info = info;

        const model = this.db.lookup(info.untrimmedAncestor);
        const item = model.GetSpaceItem()!;
        this.curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    }

    async calculate() {
        const { curve } = this;

        if (curve.IsA() === c3d.SpaceType.Polyline3D) {
            return this.trimPolyline();
        } else {
            return this.trimGeneral();
        }
    }

    private async trimPolyline() {
        const { curve, info: { start, stop } } = this;
        const polyline = curve.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);
        const allPoints = polyline.GetPoints();
        const startPoint = polyline.PointOn(start);
        const stopPoint = polyline.PointOn(stop);

        const ts = [...Array(allPoints.length).keys()];

        const result = [];
        if (polyline.IsClosed()) {
            const first = ts.filter(p => p > stop)[0];
            const last = ts.filter(p => p < start)[0];
            const index = ts.indexOf(first);
            const vertices = [];
            for (let i = index; i < index + ts.length; i++) {
                const mod = i % ts.length;
                const t = ts[mod];
                vertices.push(t);
                if (mod === last) break;
            }
            const points = vertices.map(t => allPoints[t]);
            points.unshift(stopPoint);
            points.push(startPoint);
            
            const line = c3d.ActionCurve3D.SplineCurve(points, false, c3d.SpaceType.Polyline3D);
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
        return result;
    }

    private async trimGeneral() {
        const { curve, info: { start, stop } } = this;

        const result = [];
        if (!curve.IsClosed()) {
            let from = curve.GetTMin(), to = start;
            if (Math.abs(from - to) > 10e-4) {
                const beginning = curve.Trimmed(from, to, 1)!;
                result.push(new c3d.SpaceInstance(beginning));
            }
            from = stop, to = curve.GetTMax();
            if (Math.abs(from - to) > 10e-4) {
                const ending = curve.Trimmed(from, to, 1)!;
                result.push(new c3d.SpaceInstance(ending));
            }
        } else {
            if (Math.abs(stop - start) > 10e-4) {
                const ending = curve.Trimmed(stop, start, 1)!;
                result.push(new c3d.SpaceInstance(ending));
            }
        }
        return result;
    }

    get originalItem() { return this.info.untrimmedAncestor }
}