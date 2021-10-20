import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { inst2curve, point2point, unit } from '../../util/Conversion';
import { NoOpError, ValidationError } from '../GeometryFactory';
import { ContourFactory } from "./ContourFilletFactory";
import * as visual from '../../editor/VisualModel';

export interface ControlPointInfo {
    index: number;
    origin: THREE.Vector3;
}

export class ModifyContourPointFactory extends ContourFactory {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();
    private readonly newPosition = new THREE.Vector3();
    private readonly originalPositions: THREE.Vector3[] = [];
    private curve!: c3d.Curve3D;
    private instance!: visual.SpaceInstance<visual.Curve3D>;

    get controlPoints() { return super.controlPoints }
    set controlPoints(points: visual.ControlPoint[]) {
        if (points.length < 1) throw new ValidationError();
        super.controlPoints = points;

        const firstPoint = points[0];
        const instance = firstPoint.parentItem;
        const model = this.db.lookup(instance);
        const curve = inst2curve(model)!;
        this.curve = curve;
        this.instance = instance;

        for (const point of points) {
            let position;
            if (curve instanceof c3d.PolyCurve3D) {
                position = curve.GetPoints()[point.index];
            } else if (curve instanceof c3d.Contour3D) {
                position = curve.FindCorner(point.index);
            } else if (curve instanceof c3d.Arc3D) {
                position = curve.GetLimitPoint(point.index + 1);
            } else throw new Error("not yet supported: " + curve.constructor.name);
            this.originalPositions.push(point2point(position));
        }
    }

    private _foo!: ControlPointInfo[];
    get foo() { return this._foo }
    private computeControlPoints(): ControlPointInfo[] {
        const { contour } = this;
        const segments = contour.GetSegments();
        const allControlPoints = new Map<number, THREE.Vector3>();
        let i = 0;
        for (const segment of segments) {
            if (segment.Type() === c3d.SpaceType.PolyCurve3D) {
                const polycurve = segment.Cast<c3d.PolyCurve3D>(segment.IsA());
                for (const point of polycurve.GetPoints()) {
                    allControlPoints.set(i++, point2point(point));
                }
            } else {
                allControlPoints.set(i++, point2point(segment.GetLimitPoint(1)));
            }
        }
        if (!contour.IsClosed()) allControlPoints.set(i++, point2point(contour.GetLimitPoint(2)));

        OnlySelected: {
            const { controlPoints } = this;
            if (controlPoints.length > 0) {
                const result = [];
                for (const i of controlPoints) {
                    const index = i.index;
                    const origin = allControlPoints.get(i.index)!;
                    result.push({ index, origin });
                }
                return result;
            } else {
                return [...allControlPoints.entries()].map(([index, origin]) => ({ index, origin }))
            }
        }
    }

    async calculate() {
        const { originalPositions, controlPoints, move, curve, newPosition } = this;
        if (move.manhattanLength() < 10e-5) throw new NoOpError();

        for (const [i, point] of controlPoints.entries()) {
            const originalPosition = originalPositions[i];
            newPosition.copy(originalPosition).add(move);
            const index = point.index;

            if (curve instanceof c3d.PolyCurve3D) {
                curve.ChangePoint(index, point2point(newPosition));
                curve.Rebuild();
            } else if (curve instanceof c3d.Arc3D) {
                if (curve.IsClosed()) {
                    const center = point2point(curve.GetCentre());
                    curve.SetRadius(unit(center.distanceTo(newPosition)));
                } else {
                    curve.SetLimitPoint(index + 1, point2point(newPosition));
                }
            }
        }

        return new c3d.SpaceInstance(curve);
    }

    get originalPosition(): THREE.Vector3 {
        const result = new THREE.Vector3();
        for (const point of this.originalPositions) {
            result.add(point);
        }
        result.divideScalar(this.controlPoints.length);
        return result;
    }

    get originalItem() { return this.instance }
}
