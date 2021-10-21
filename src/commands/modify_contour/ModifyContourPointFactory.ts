import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { computeControlPointInfo, ControlPointInfo, point2point } from '../../util/Conversion';
import { NoOpError } from '../GeometryFactory';
import { ContourFactory } from "./ContourFilletFactory";

export interface ModifyContourPointParams {
    get controlPointInfo(): ControlPointInfo[];
    controlPoint: number;
    move: THREE.Vector3;
}

export class ModifyContourPointFactory extends ContourFactory implements ModifyContourPointParams {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();
    controlPoint!: number;
    private readonly originalPosition = new THREE.Vector3();

    get contour(): c3d.Contour3D { return super.contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        super.contour = inst;
        this._controlPointInfo = computeControlPointInfo(this.contour);
    }

    private _controlPointInfo!: ControlPointInfo[];
    get controlPointInfo() { return this._controlPointInfo }

    async calculate() {
        const { contour, move, controlPoint, controlPointInfo } = this;
        if (move.manhattanLength() < 10e-5) throw new NoOpError();

        const info = controlPointInfo[controlPoint];
        const segments = contour.GetSegments();
        const active = segments[info.segmentIndex];
        let before = segments[info.segmentIndex - 1];
        if (before === undefined && contour.IsClosed()) before = segments[segments.length - 1];
        switch (info.limit) {
            case -1:
                this.changePoint(active, info);
                break;
            case 1:
                this.moveLimitPoint(1, active, info);
                if (before !== undefined) this.moveLimitPoint(2, before, info);
                break;
            case 2:
                this.moveLimitPoint(2, active, info);
                break;
        }

        const result = new c3d.Contour3D();
        for (const segment of segments) {
            result.AddCurveWithRuledCheck(segment, 1e-5, true);
        }

        return new c3d.SpaceInstance(result);
    }

    private readonly to = new THREE.Vector3();
    private moveLimitPoint(point: 1 | 2, curve: c3d.Curve3D, info: ControlPointInfo) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        const { move, to } = this;
        const newPosition = to.copy(info.origin).add(move);
        if (cast instanceof c3d.PolyCurve3D) {
            if (cast instanceof c3d.Polyline3D) {
                cast.ChangePoint(point - 1, point2point(newPosition));
            } else {
                if (point === 1) cast.ChangePoint(0, point2point(newPosition));
                else cast.ChangePoint(cast.GetPoints().length - 1, point2point(newPosition));
            }
            cast.Rebuild();
        } else if (cast instanceof c3d.Arc3D) {
            cast.SetLimitPoint(point, point2point(newPosition));
        }
    }

    private changePoint(curve: c3d.Curve3D, info: ControlPointInfo) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        const { move, to } = this;
        const newPosition = to.copy(info.origin).add(move);
        if (!(cast instanceof c3d.PolyCurve3D)) throw new Error();
        cast.ChangePoint(info.index, point2point(newPosition));
        cast.Rebuild();
    }
}
