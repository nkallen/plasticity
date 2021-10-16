import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve, point2point, unit, vec2vec } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import LineFactory from '../line/LineFactory';
import JoinCurvesFactory from './JoinCurvesFactory';

/**
 * Filleting curves is idiosyncratic. The underlying c3d method uses Contours only. Thus, to fillet a polyline, it
 * has to be converted to a contour first. Polyline and Contours can be treated somewhat uniformly.
 */

interface CornerAngle {
    index: number;
    origin: THREE.Vector3;
    tau: THREE.Vector3;
    axis: THREE.Vector3;
    angle: number;
}

export class ContourFilletFactory extends GeometryFactory {
    async prepare(curves: visual.SpaceInstance<visual.Curve3D>[]): Promise<c3d.SpaceInstance> {
        const result: Promise<c3d.SpaceInstance>[] = [];
        for (const curve of curves) {
            const { db } = this;
            const inst = db.lookup(curve);
            const item = inst.GetSpaceItem()!;
            switch (item.IsA()) {
                case c3d.SpaceType.Polyline3D:
                    const polyline2contour = new Polyline2ContourFactory(this.db, this.materials, this.signals);
                    polyline2contour.polyline = curve;
                    result.push(polyline2contour.calculate());
                    break;
                case c3d.SpaceType.Contour3D:
                    result.push(Promise.resolve(inst));
                    break;
                default: throw new Error("invalid precondition: " + c3d.SpaceType[item.Type()]);
            }
        }
        return result[0];
    }

    readonly radiuses!: number[];

    private _contour!: c3d.Contour3D;
    get contour(): c3d.Contour3D { return this._contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        if (inst instanceof c3d.SpaceInstance) {
            const curve = inst2curve(inst);
            if (!(curve instanceof c3d.Contour3D)) throw new ValidationError();
            this._contour = curve;
        } else if (inst instanceof visual.SpaceInstance) {
            this.originalItem = [inst];
            this.contour = this.db.lookup(inst);
            return;
        } else this._contour = inst;

        let fillNumber = this.contour.GetSegmentsCount();
        fillNumber -= this.contour.IsClosed() ? 0 : 1;
        (this.radiuses as ContourFilletFactory['radiuses']) = new Array<number>(fillNumber);
        this.radiuses.fill(0);
    }

    get cornerAngles(): CornerAngle[] {
        const result = [];
        const contour = this._contour;
        for (let i = 0, l = contour.GetSegmentsCount(); i < l; i++) {
            try {
                const info = contour.GetCornerAngle(i + 1);
                result.push(this.info2info(i, info));
            } catch (e) { }
        }
        return result;
    }

    private info2info(index: number, info: ReturnType<c3d.Contour3D["GetCornerAngle"]>) {
        return {
            index,
            origin: point2point(info.origin),
            tau: vec2vec(info.tau, 1),
            axis: vec2vec(info.axis, 1),
            angle: info.angle,
        }
    }

    async calculate() {
        const { _contour, radiuses } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(_contour, radiuses.map(unit), c3d.ConnectingType.Fillet);
        return new c3d.SpaceInstance(result);
    }

    private _originals!: visual.SpaceInstance<visual.Curve3D>[];
    set originalItem(originals: visual.SpaceInstance<visual.Curve3D>[]) { this._originals = originals }
    get originalItem() { return this._originals }
}

export class Polyline2ContourFactory extends GeometryFactory {
    polyline!: visual.SpaceInstance<visual.Curve3D>;

    async calculate() {
        const { db, polyline } = this;
        const inst = db.lookup(polyline);
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);
        const points = model.GetPoints();
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
        if (model.IsClosed()) {
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

    get originalItem() { return this.polyline }
}
