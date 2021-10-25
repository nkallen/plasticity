import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { CornerAngle, cornerInfo, inst2curve, point2point, unit, vec2vec } from '../../util/Conversion';
import JoinCurvesFactory from '../curve/JoinCurvesFactory';
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import LineFactory from '../line/LineFactory';

/**
 * Filleting curves is idiosyncratic. The underlying c3d method uses Contours only. Thus, to fillet a polyline, it
 * has to be converted to a contour first. Polyline and Contours can be treated somewhat uniformly.
 */

export interface FilletCurveParams {
    cornerAngles: CornerAngle[];
    radiuses: number[];
}

export interface SegmentAngle {
    origin: THREE.Vector3;
    normal: THREE.Vector3;
}

export class ContourFilletFactory extends GeometryFactory {
    radiuses!: number[];

    async calculate() {
        const { contour, radiuses } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(contour, radiuses.map(unit), c3d.ConnectingType.Fillet);
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

        const contour = this._contour;
        const allCorners = cornerInfo(contour);

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

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    set originalItem(original: visual.SpaceInstance<visual.Curve3D>) { this._original = original }
    get originalItem() { return this._original }
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
