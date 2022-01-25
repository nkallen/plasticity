import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { inst2curve } from '../../util/Conversion';
import { GeometryFactory } from '../../command/GeometryFactory';

export default class TrimFactory extends GeometryFactory {
    start!: number;
    stop!: number;

    private _curve!: c3d.Curve3D;
    get curve(): c3d.Curve3D { return this._curve }
    set curve(curve: c3d.Curve3D | visual.SpaceInstance<visual.Curve3D>){
        if (curve instanceof c3d.Curve3D) this._curve = curve;
        else {
            const model = this.db.lookup(curve);
            this._curve = inst2curve(model)!;
        }
    }

    set fragment(fragment: visual.SpaceInstance<visual.Curve3D>) {
        const info = fragment.underlying.fragmentInfo;
        if (info === undefined) throw new Error("invalid precondition");
        this.start = info.start;
        this.stop = info.stop;
        this._original = info.untrimmedAncestor;
        const model = this.db.lookup(info.untrimmedAncestor);
        this._curve = inst2curve(model)!;
    }

    async calculate() {
        const { start, stop } = this;
        if (start === -1 && stop === -1) return [];

        if (this.curve.IsA() === c3d.SpaceType.Polyline3D) {
            return this.trimPolyline();
        } else {
            return this.trimGeneral();
        }
    }

    private async trimPolyline() {
        const { curve, start, stop } = this;
        const polyline = curve.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);
        const allPoints = polyline.GetPoints();
        const startPoint = polyline.PointOn(start);
        const stopPoint = polyline.PointOn(stop);

        const ts = [...Array(allPoints.length).keys()];

        const result = [];
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
        return result;
    }

    private async trimGeneral() {
        const { curve,  start, stop } = this;

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

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    get originalItem() { return this._original }
}