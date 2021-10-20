import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { inst2curve, point2point, unit } from '../../util/Conversion';
import { NoOpError, ValidationError } from '../GeometryFactory';
import { ContourFactory } from "./ContourFilletFactory";
import * as visual from '../../editor/VisualModel';

export interface ModifyContourPointParams {
    get controlPointInfo(): ControlPointInfo[];
    controlPoint: number;
    move: THREE.Vector3;
}

export interface ControlPointInfo {
    index: number;
    origin: THREE.Vector3;
    segmentIndex: number;
    limit: -1 | 1 | 2;
}

export class ModifyContourPointFactory extends ContourFactory implements ModifyContourPointParams {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();
    controlPoint!: number;
    private readonly originalPosition = new THREE.Vector3();

    get contour(): c3d.Contour3D { return super.contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        super.contour = inst;
        this._controlPointInfo = this.computeControlPointInfo();
    }

    private _controlPointInfo!: ControlPointInfo[];
    get controlPointInfo() { return this._controlPointInfo }
    private computeControlPointInfo(): ControlPointInfo[] {
        const { contour } = this;
        const segments = contour.GetSegments();
        const allControlPoints = new Map<number, ControlPointInfo>();
        let i = 0;
        for (const [segmentIndex, segment] of segments.entries()) {
            if (segment.Type() === c3d.SpaceType.PolyCurve3D && segment.IsA() !== c3d.SpaceType.Polyline3D) {
                const polycurve = segment.Cast<c3d.PolyCurve3D>(segment.IsA());
                const points = polycurve.GetPoints();
                for (const [j, point] of points.entries()) {
                    const limit = j === 0 ? 1 : j === points.length - 1 ? 2 : -1;
                    const info: ControlPointInfo = { origin: point2point(point), segmentIndex, limit, index: i }
                    allControlPoints.set(i++, info);
                }
            } else {
                const info: ControlPointInfo = { origin: point2point(segment.GetLimitPoint(1)), segmentIndex, limit: 1, index: i }
                allControlPoints.set(i++, info);
            }
        }
        const segmentIndex = segments.length - 1;
        const info: ControlPointInfo = { origin: point2point(contour.GetLimitPoint(2)), segmentIndex, limit: 2, index: i }
        if (!contour.IsClosed()) allControlPoints.set(i++, info);

        const result = [];
        for (const info of allControlPoints.values()) {
            result.push({ ...info });
        }
        return result;
    }

    async calculate() {
        const { originalPosition, contour, move, controlPoint, controlPointInfo } = this;
        if (move.manhattanLength() < 10e-5) throw new NoOpError();

        const info = controlPointInfo[controlPoint];
        const segments = contour.GetSegments();
        const before = segments[info.segmentIndex - 1];
        const active = segments[info.segmentIndex];
        const after = segments[info.segmentIndex + 1];
        switch (info.limit) {
            case -1:
                break;
            case 1:
                this.moveLimitPoint(1, active, info);
                if (before !== undefined) this.moveLimitPoint(2, before, info);
                break;
            case 2:
                this.moveLimitPoint(2, active, info);
                break;
        }

        // for (const [i, point] of controlPoints.entries()) {
        //     const originalPosition = originalPositions[i];
        //     newPosition.copy(originalPosition).add(move);
        //     const index = point.index;

        //     if (curve instanceof c3d.PolyCurve3D) {
        //         curve.ChangePoint(index, point2point(newPosition));
        //         curve.Rebuild();
        //     } else if (curve instanceof c3d.Arc3D) {
        //         if (curve.IsClosed()) {
        //             const center = point2point(curve.GetCentre());
        //             curve.SetRadius(unit(center.distanceTo(newPosition)));
        //         } else {
        //             curve.SetLimitPoint(index + 1, point2point(newPosition));
        //         }
        //     }
        // }

        const result = new c3d.Contour3D();
        for (const segment of segments) {
            result.AddCurveWithRuledCheck(segment, 1e-5, true);
        }

        return new c3d.SpaceInstance(result);
    }

    private moveLimitPoint(point: 1 | 2, curve: c3d.Curve3D, info: ControlPointInfo) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        const { move } = this;
        const newPosition = info.origin.clone().add(move); // FIXME remove clone
        if (cast instanceof c3d.PolyCurve3D) {
            cast.ChangePoint(point - 1, point2point(newPosition));
            cast.Rebuild();
        }
    }
}
