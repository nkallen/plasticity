import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
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
