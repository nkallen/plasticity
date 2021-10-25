import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { computeControlPointInfo, ControlPointInfo, inst2curve, point2point } from '../../util/Conversion';
import { GeometryFactory, NoOpError, ValidationError } from '../GeometryFactory';
import { ModifyContourFactory } from "./ModifyContourFactory";

export interface ModifyContourPointParams {
    get controlPointInfo(): ControlPointInfo[];
    set controlPoints(cps: visual.ControlPoint[] | number[]);
    move: THREE.Vector3;
}

export class ModifyContourPointFactory extends GeometryFactory implements ModifyContourPointParams {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();

    prepare(inst: visual.SpaceInstance<visual.Curve3D>): Promise<c3d.SpaceInstance> {
        const factory = new ModifyContourFactory(this.db, this.materials, this.signals)    ;
        return factory.prepare(inst);
    }

    private _controlPoints: visual.ControlPoint[] = [];
    get controlPoints() { return this._controlPoints }
    set controlPoints(controlPoints: visual.ControlPoint[]) {
        this._controlPoints = controlPoints;
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

        this._controlPointInfo = computeControlPointInfo(this.contour);
    }

    private _controlPointInfo!: ControlPointInfo[];
    get controlPointInfo() { return this._controlPointInfo }

    async calculate() {
        const { contour, move, controlPoints, controlPointInfo } = this;
        if (move.manhattanLength() < 10e-5) throw new NoOpError();

        const info = controlPointInfo[controlPoints[0].index];
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

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    set originalItem(original: visual.SpaceInstance<visual.Curve3D>) { this._original = original }
    get originalItem() { return this._original }
}
