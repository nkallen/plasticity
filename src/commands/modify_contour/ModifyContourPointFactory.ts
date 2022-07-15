import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import * as visual from '../../visual_model/VisualModel';
import { computeControlPointInfo, ControlPointInfo, inst2curve, normalizeCurve, point2point, unit } from '../../util/Conversion';
import { GeometryFactory, NoOpError, ValidationError } from '../../command/GeometryFactory';
import { FreestyleScaleFactory, FreestyleScaleFactoryLike, MoveFactoryLike, MoveParams, RotateFactoryLike, ScaleParams } from "../translate/TranslateItemFactory";

export interface ModifyContourPointParams {
    get controlPointInfo(): ControlPointInfo[];
    set controlPoints(cps: number[] | visual.ControlPoint[]);
}

abstract class ContourPointFactory extends GeometryFactory {
    private _controlPoints: number[] = [];
    get controlPoints(): number[] { return this._controlPoints }
    set controlPoints(controlPoints: visual.ControlPoint[] | number[]) {
        const result = [];
        for (const cp of controlPoints) {
            if (cp instanceof visual.ControlPoint) result.push(cp.index);
            else result.push(cp);
        }
        this._controlPoints = result;
    }

    async prepare(view: visual.SpaceInstance<visual.Curve3D>) {
        const inst = this.db.lookup(view);
        const curve = inst2curve(inst)!;
        const result = await normalizeCurve(curve);
        return result;
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
        } else if (inst instanceof c3d.Contour3D) {
            this._contour = inst;
        } else throw new ValidationError("normalize the curve first: " + normalizeCurve.name);

        this._controlPointInfo = computeControlPointInfo(this.contour);
    }

    protected moveLimitPoint(point: 1 | 2, curve: c3d.Curve3D, info: ControlPointInfo, to: THREE.Vector3) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        if (cast instanceof c3d.PolyCurve3D) {
            if (cast instanceof c3d.Polyline3D) {
                if (cast.GetPoints().length !== 2) throw new ValidationError();
                cast.ChangePoint(point - 1, point2point(to));
            } else {
                if (point === 1) cast.ChangePoint(0, point2point(to));
                else cast.ChangePoint(cast.GetPoints().length - 1, point2point(to));
            }
            cast.Rebuild();
        } else if (cast instanceof c3d.Arc3D) {
            cast.SetLimitPoint(point, point2point(to));
        }
    }

    private _controlPointInfo!: ControlPointInfo[];
    get controlPointInfo() { return this._controlPointInfo }

    private _original!: visual.SpaceInstance<visual.Curve3D>;
    set originalItem(original: visual.SpaceInstance<visual.Curve3D>) { this._original = original }
    get originalItem() { return this._original }
}

abstract class ModifyContourPointFactory extends ContourPointFactory implements ModifyContourPointParams {
    protected changePoint(curve: c3d.Curve3D, info: ControlPointInfo, to: THREE.Vector3) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        if (!(cast instanceof c3d.PolyCurve3D)) throw new Error();
        cast.ChangePoint(info.index, point2point(to));
        cast.Rebuild();
    }

    async calculate() {
        const { contour, controlPoints, controlPointInfo } = this;

        this.validate();

        const segments = contour.GetSegments();
        for (const controlPoint of controlPoints) {
            const info = controlPointInfo[controlPoint];
            const to = this.computeDestination(info);
            const active = segments[info.segmentIndex];
            let before = segments[info.segmentIndex - 1];
            if (before === undefined && contour.IsClosed() && segments.length > 1) before = segments[segments.length - 1];
            switch (info.limit) {
                case 'other':
                    this.changePoint(active, info, to);
                    break;
                case 'first':
                    this.moveLimitPoint(1, active, info, to);
                    if (before !== undefined) this.moveLimitPoint(2, before, info, to);
                    break;
                case 'last':
                    this.moveLimitPoint(2, active, info, to);
                    break;
            }
        }

        const result = new c3d.Contour3D();
        for (const segment of segments) {
            result.AddCurveWithRuledCheck(segment, 1e-5, true);
        }

        return new c3d.SpaceInstance(result);
    }

    protected abstract computeDestination(info: ControlPointInfo): THREE.Vector3;
    protected abstract validate(): void;
}

export interface MoveContourPointParams extends ModifyContourPointParams, MoveParams {
    pivot: THREE.Vector3;
    move: THREE.Vector3;
}

export class MoveContourPointFactory extends ModifyContourPointFactory implements ModifyContourPointParams, MoveFactoryLike {
    pivot = new THREE.Vector3();
    move = new THREE.Vector3();

    private readonly to = new THREE.Vector3();

    protected computeDestination(info: ControlPointInfo) {
        return this.to.copy(info.origin).add(this.move);
    }

    validate() {
        if (this.move.manhattanLength() < 10e-5) throw new NoOpError();
    }

    async showPhantoms() { }

    get items() { return [] }
}

const identity = new THREE.Vector3(1, 1, 1);

export class ScaleContourPointFactory extends ModifyContourPointFactory implements ScaleParams {
    pivot = new THREE.Vector3();
    scale = new THREE.Vector3(1, 1, 1);

    private readonly to = new THREE.Vector3();

    protected computeDestination(info: ControlPointInfo) {
        return this.to.copy(info.origin).sub(this.pivot).multiply(this.scale).add(this.pivot);
    }

    validate() {
        if (this.scale.manhattanDistanceTo(identity) < 10e-5) throw new NoOpError();
    }
}

export class FreestyleScaleContourPointFactory extends ModifyContourPointFactory implements FreestyleScaleFactoryLike {
    private readonly freestyle = new FreestyleScaleFactory(this.db, this.materials, this.signals);

    scale = new THREE.Vector3(1, 1, 1);

    private readonly dest = new THREE.Vector3();
    protected computeDestination(info: ControlPointInfo) {
        return this.dest.copy(info.origin).applyMatrix4(this.freestyle.deunitMatrix);
    }

    validate() { }

    set pivot(pivot: THREE.Vector3) { this.freestyle.pivot = pivot }
    from(p1: THREE.Vector3, p2: THREE.Vector3) { this.freestyle.from(p1, p2) }
    to(p1: THREE.Vector3, p2: THREE.Vector3) { this.freestyle.to(p1, p2) }
    get ref() { return this.freestyle.ref }
    async showPhantoms() { }
}

export class RotateContourPointFactory extends ModifyContourPointFactory implements RotateFactoryLike {
    pivot = new THREE.Vector3();
    axis = new THREE.Vector3(1, 0, 0);
    angle = 0;

    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    private readonly to = new THREE.Vector3();

    protected computeDestination(info: ControlPointInfo) {
        const { to, pivot, axis, angle } = this;
        return to.copy(info.origin).sub(pivot).applyAxisAngle(axis, angle).add(pivot);
    }

    validate() {
        if (Math.abs(this.angle) < 10e-5) throw new NoOpError();
    }

    async showPhantoms() { }
}

export class RemoveContourPointFactory extends ContourPointFactory {
    async calculate(): Promise<c3d.SpaceInstance[]> {
        const { contour, controlPoints } = this;

        controlPoints.sort();
        let offset = 0;
        for (const controlPoint of controlPoints) {
            const controlPointInfo = computeControlPointInfo(contour);
            const segments = contour.GetSegments();
            const info = controlPointInfo[controlPoint - offset];
            const active = segments[info.segmentIndex];
            let before = segments[info.segmentIndex - 1];
            if (before === undefined && contour.IsClosed()) before = segments[segments.length - 1];
            let after = segments[info.segmentIndex + 1];
            if (after === undefined && contour.IsClosed()) after = segments[0];
            switch (info.limit) {
                case 'other':
                    this.removePoint(active, info);
                    break;
                case 'first':
                    this.removeLimitPoint(1, active, info, before, after);
                    break;
                case 'last':
                    this.removeLimitPoint(2, active, info, before, after);
                    break;
            }
            offset++;
        }

        if (contour.GetSegmentsCount() === 0) return [];
        else return [new c3d.SpaceInstance(contour)];
    }

    protected removeLimitPoint(point: 1 | 2, curve: c3d.Curve3D, info: ControlPointInfo, before: c3d.Curve3D, after: c3d.Curve3D) {
        const { contour } = this;
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        if (cast instanceof c3d.PolyCurve3D) {
            const points = cast.GetPoints();
            const polyCurveWithOnly2Points = points.length === 2;
            if (cast instanceof c3d.Polyline3D || polyCurveWithOnly2Points) {
                if (points.length !== 2) throw new ValidationError();
                contour.DeleteSegment(info.segmentIndex);
                if (point === 1) {
                    const to = point2point(points[1]);
                    if (before !== undefined) this.moveLimitPoint(2, before, info, to);
                } else {
                    const to = point2point(points[0]);
                    if (after !== undefined) this.moveLimitPoint(1, after, info, to);
                }
            } else {
                cast.RemovePoint(info.index);
                if (point === 1) {
                    const to = point2point(points[points.length - 1]);
                    if (before !== undefined) this.moveLimitPoint(2, before, info, to);
                } else {
                    const to = point2point(points[0]);
                    if (after !== undefined) this.moveLimitPoint(1, after, info, to);
                }
            }
            cast.Rebuild();
        } else if (cast instanceof c3d.Arc3D){
            contour.DeleteSegment(info.segmentIndex);
            if (point === 1) {
                const to = point2point(cast.GetLimitPoint(2));
                if (before !== undefined) this.moveLimitPoint(2, before, info, to);
            } else {
                const to = point2point(cast.GetLimitPoint(1));
                if (after !== undefined) this.moveLimitPoint(1, after, info, to);
            }
        }
    }

    protected removePoint(curve: c3d.Curve3D, info: ControlPointInfo) {
        const cast = curve.Cast<c3d.Curve3D>(curve.IsA());
        if (!(cast instanceof c3d.PolyCurve3D)) throw new Error();
        cast.RemovePoint(info.index);
        cast.Rebuild();
    }
}