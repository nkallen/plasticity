import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve } from '../../util/Conversion';
import { GeometryFactory } from "../GeometryFactory";
import { ContourFilletFactory, CornerAngle, Polyline2ContourFactory, SegmentAngle } from "./ContourFilletFactory";
import { ModifyContourPointFactory, ModifyContourPointParams } from "./ModifyContourPointFactory";
import { ModifyContourSegmentFactory, ModifyContourSegmentParams } from "./ModifyContourSegmentFactory";

type Mode = 'fillet' | 'offset' | 'change-point';

export interface ModifyContourParams extends ModifyContourSegmentParams, ModifyContourPointParams {
    mode: Mode;
    segmentAngles: SegmentAngle[];
    cornerAngles: CornerAngle[];
    radiuses: number[];
}

export class ModifyContourFactory extends GeometryFactory implements ModifyContourParams {
    mode: Mode = 'offset';

    private readonly segments = new ModifyContourSegmentFactory(this.db, this.materials, this.signals);
    private readonly fillets = new ContourFilletFactory(this.db, this.materials, this.signals);
    private readonly points = new ModifyContourPointFactory(this.db, this.materials, this.signals);

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
                    const polyline = item.Cast<c3d.Polyline3D>(item.IsA());
                    if (polyline.GetCount() === 1) result.AddCurveWithRuledCheck(polyline as c3d.Curve3D, 10e-5)
                    else {
                        const polyline2contour = new Polyline2ContourFactory(this.db, this.materials, this.signals);
                        polyline2contour.polyline = polyline;
                        const inst = await polyline2contour.calculate();
                        process.push(inst2curve(inst)!);
                    }
                    break;
                case c3d.SpaceType.Contour3D:
                    const decompose = item.Cast<c3d.Contour3D>(item.IsA());
                    for (const segment of decompose.GetSegments()) process.push(segment);
                    break;
                case c3d.SpaceType.TrimmedCurve3D:
                    const trimmed = item.Cast<c3d.TrimmedCurve3D>(item.IsA());
                    const basis = trimmed.GetBasisCurve();
                    const cast = basis.Cast<c3d.Curve3D>(basis.IsA());
                    if (cast instanceof c3d.Polyline3D) {
                        const originalPoints = cast.GetPoints();
                        const ts = [...Array(originalPoints.length).keys()];
                        const tmin = trimmed.GetTMin();
                        const tmax = trimmed.GetTMax();
                        const keep = ts.filter(t => t > tmin && t < tmax);
                        const points = [trimmed.GetLimitPoint(1), ...keep.map(t => cast._PointOn(t)), trimmed.GetLimitPoint(2)];
                        process.push(new c3d.Polyline3D(points, false));
                        break;
                    } else throw new Error();
                default:
                    result.AddCurveWithRuledCheck(item.Cast<c3d.Curve3D>(item.IsA()), 10e-5);
            }
        }
        return new c3d.SpaceInstance(result);
    }

    get radiuses() { return this.fillets.radiuses }
    set radiuses(radiuses: number[]) { this.fillets.radiuses = radiuses }
    get segmentAngles() { return this.segments.segmentAngles }
    get cornerAngles() { return this.fillets.cornerAngles }
    get distance() { return this.segments.distance }
    set distance(distance: number) { this.segments.distance = distance }
    get segment() { return this.segments.segment }
    set segment(segment: number) { this.segments.segment = segment }
    get controlPointInfo() { return this.points.controlPointInfo }
    set controlPoint(controlPoint: number) { this.points.controlPoint = controlPoint }
    set move(move: THREE.Vector3) { this.points.move = move }
    get move() { return this.points.move }


    set contour(contour: c3d.SpaceInstance) {
        this.segments.contour = contour;
        this.fillets.contour = contour;
        this.points.contour = contour;
    }

    async calculate() {
        switch (this.mode) {
            case 'fillet':
                return this.fillets.calculate();
            case 'offset':
                return this.segments.calculate();
            case 'change-point':
                return this.points.calculate();
        }
    }

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    set originalItem(original: visual.SpaceInstance<visual.Curve3D>) { this._original = original }
    get originalItem() { return this._original }
}

