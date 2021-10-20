import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve, point2point, unit, vec2vec } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import LineFactory from '../line/LineFactory';
import JoinCurvesFactory from '../curve/JoinCurvesFactory';

/**
 * Filleting curves is idiosyncratic. The underlying c3d method uses Contours only. Thus, to fillet a polyline, it
 * has to be converted to a contour first. Polyline and Contours can be treated somewhat uniformly.
 */

export interface FilletCurveParams {
    cornerAngles: CornerAngle[];
    radiuses: number[];
}

export interface CornerAngle {
    index: number;
    origin: THREE.Vector3;
    tau: THREE.Vector3;
    axis: THREE.Vector3;
    angle: number;
}

export interface SegmentAngle {
    origin: THREE.Vector3;
    normal: THREE.Vector3;
}

export abstract class ContourFactory extends GeometryFactory {
    radiuses!: number[];

    async prepare(curve: visual.SpaceInstance<visual.Curve3D>): Promise<c3d.SpaceInstance> {
        const { db } = this;
        const inst = db.lookup(curve);
        const item = inst.GetSpaceItem()! as c3d.Curve3D;
        const result = new c3d.Contour3D();
        const process: c3d.Curve3D[] = [item.Duplicate() as c3d.Curve3D];
        while (process.length > 0) {
            const item = process.pop()!;
            switch (item.IsA()) {
                case c3d.SpaceType.Polyline3D:
                    const polyline = item.Cast<c3d.Polyline3D>(item.IsA()); // This should work but doesn't
                    if (polyline.GetCount() === 1) result.AddCurveWithRuledCheck(polyline as c3d.Curve3D, 10e-5)
                    else {
                        const polyline2contour = new Polyline2ContourFactory(this.db, this.materials, this.signals);
                        polyline2contour.polyline = polyline;
                        const inst = await polyline2contour.calculate();
                        process.push(inst2curve(inst)!);
                    }
                    break;
                case c3d.SpaceType.Contour3D:
                    const decompose = (item instanceof c3d.Contour3D) ? item : item.Cast<c3d.Contour3D>(item.IsA());
                    // const decompose = item.Cast<c3d.Contour3D>(item.IsA()); // This should work but doesn't // FIXME when there's time
                    for (const segment of decompose.GetSegments()) process.push(segment);
                    break;
                default:
                    result.AddCurveWithRuledCheck(item.Cast<c3d.Curve3D>(item.IsA()), 10e-5);
            }
        }
        return new c3d.SpaceInstance(result);
    }

    private _contour!: c3d.Contour3D;
    get contour(): c3d.Contour3D { return this._contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        if (inst instanceof c3d.SpaceInstance) {
            const curve = inst2curve(inst);
            if (!(curve instanceof c3d.Contour3D)) throw new ValidationError("Contour expected");
            this._contour = curve;
        } else if (inst instanceof visual.SpaceInstance) {
            this.contour = this.db.lookup(inst);
            this.originalItem = inst;
            return;
        } else this._contour = inst;

        let fillNumber = this.contour.GetSegmentsCount();
        fillNumber -= this.contour.IsClosed() ? 0 : 1;
        this.radiuses = new Array<number>(fillNumber);
        this.radiuses.fill(0);
    }

    private _controlPoints: visual.ControlPoint[] = [];
    get controlPoints() { return this._controlPoints }
    set controlPoints(controlPoints: visual.ControlPoint[]) {
        this._controlPoints = controlPoints;
    }

    get cornerAngles(): CornerAngle[] {
        const controlPoints = this._controlPoints;

        const allCorners = new Map<number, CornerAngle>();
        const contour = this._contour;
        const segmentCount = contour.GetSegmentsCount();
        for (let i = 1, l = segmentCount; i < l; i++) {
            try {
                const info = contour.GetCornerAngle(i);
                allCorners.set(i, this.convertCornerAngleInfo(i - 1, info));
            } catch (e) { }
        }
        if (contour.IsClosed()) {
            try {
                const start = this.convertCornerAngleInfo(segmentCount - 1, contour.GetCornerAngle(segmentCount));
                allCorners.set(0, start);
            } catch (e) { }
        }

        OnlyCornersForSelectedControlPoints: {
            if (controlPoints.length > 0) {
                const result = [];
                for (const point of controlPoints) {
                    result.push(allCorners.get(point.index)!);
                }
                return result;
            } else {
                return [...allCorners.values()];
            }
        }
    }

    private convertCornerAngleInfo(index: number, info: ReturnType<c3d.Contour3D["GetCornerAngle"]>) {
        return {
            index,
            origin: point2point(info.origin),
            tau: vec2vec(info.tau, 1),
            axis: vec2vec(info.axis, 1),
            angle: info.angle,
        }
    }

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    set originalItem(original: visual.SpaceInstance<visual.Curve3D>) { this._original = original }
    get originalItem() { return this._original }
}

export class ContourFilletFactory extends ContourFactory {
    radiuses!: number[];

    async calculate() {
        const { contour, radiuses } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(contour, radiuses.map(unit), c3d.ConnectingType.Fillet);
        return new c3d.SpaceInstance(result);
    }
}

export class Polyline2ContourFactory extends GeometryFactory {
    private _polyline!: c3d.Polyline3D;
    get polyline(): c3d.Polyline3D { return this._polyline }
    set polyline(polyline: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D | c3d.Polyline3D) {
        if (polyline instanceof visual.SpaceInstance) {
            const inst = this.db.lookup(polyline);
            const curve = inst2curve(inst);
            this._polyline = curve as c3d.Polyline3D;
        } else if (polyline instanceof c3d.Polyline3D) {
            this._polyline = polyline
        } else {
            this._polyline = polyline.Cast<c3d.Polyline3D>(polyline.IsA());
        }
    }

    async calculate() {
        const { db, polyline } = this;
        const points = polyline.GetPoints();
        if (points.length < 2) throw new Error("invalid precondition");
        let prev = points.shift()!;
        const start = prev;
        const segments = [];
        for (const curr of points) {
            const factory = new LineFactory(this.db, this.materials, this.signals);
            factory.p1 = point2point(prev);
            factory.p2 = point2point(curr);
            const segment = factory.calculate();
            segments.push(segment);
            prev = curr;
        }
        if (polyline.IsClosed()) {
            const factory = new LineFactory(this.db, this.materials, this.signals);
            factory.p1 = point2point(prev);
            factory.p2 = point2point(start);
            const segment = factory.calculate();
            segments.push(segment);
        }
        if (segments.length === 1) return segments[0];

        const finished = await Promise.all(segments);
        const makeContour = new JoinCurvesFactory(this.db, this.materials, this.signals);
        for (const segment of finished) makeContour.push(segment);
        const result = await makeContour.calculate();
        return result[0];
    }
}
