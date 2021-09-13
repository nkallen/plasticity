import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { point2point } from "../../util/Conversion";
import { GeometryFactory, NoOpError, ValidationError } from '../GeometryFactory';
import { MoveParams } from "../translate/TranslateFactory";

abstract class ControlPointFactory extends GeometryFactory {
    protected curve!: c3d.Curve3D;
    protected instance!: visual.SpaceInstance<visual.Curve3D>;
    readonly originalPositions: THREE.Vector3[] = [];

    _controlPoints!: visual.ControlPoint[];
    get controlPoints() { return this._controlPoints }
    set controlPoints(points: visual.ControlPoint[]) {
        if (points.length < 1) throw new ValidationError();
        this._controlPoints = points;

        const firstPoint = points[0];
        const instance = firstPoint.parentItem;
        let model = this.db.lookup(instance);
        model = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const item = model.GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());
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
            } else throw new Error("not yet supported");
            this.originalPositions.push(point2point(position));
        }
    }

    get originalItem() {
        return this.instance;
    }
}

export class ChangePointFactory extends ControlPointFactory implements MoveParams {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();
    private newPosition = new THREE.Vector3();

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
                    curve.SetRadius(center.distanceTo(newPosition));
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
}

export class RemovePointFactory extends ControlPointFactory {
    async calculate() {
        const { controlPoints, curve } = this;
        if (!(curve instanceof c3d.PolyCurve3D)) throw new ValidationError();

        for (const point of controlPoints) {
            curve.RemovePoint(point.index);
        }

        return new c3d.SpaceInstance(curve);
    }
}