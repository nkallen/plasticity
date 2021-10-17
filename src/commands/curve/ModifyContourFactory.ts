import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve, point2point, vec2vec } from '../../util/Conversion';
import { ValidationError } from '../GeometryFactory';
import { ContourFactory } from "./ContourFilletFactory";

export interface SegmentAngle {
    origin: THREE.Vector3;
    normal: THREE.Vector3;
}

export interface ModifyContourParams {
    distances: number[];
    segmentAngles: SegmentAngle[];
}

export class ModifyContourFactory extends ContourFactory implements ModifyContourParams {
    private _contour!: c3d.Contour3D;
    get contour(): c3d.Contour3D { return this._contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        if (inst instanceof c3d.SpaceInstance) {
            const curve = inst2curve(inst);
            if (!(curve instanceof c3d.Contour3D)) throw new ValidationError("Contour expected");
            this._contour = curve;
        } else if (inst instanceof visual.SpaceInstance) {
            this.contour = this.db.lookup(inst);
            return;
        } else this._contour = inst;

        let fillNumber = this.contour.GetSegmentsCount();
        this.distances = new Array<number>(fillNumber);
        this.distances.fill(0);
    }

    distances!: number[];

    async calculate() {
        const { contour, distances } = this;
        const segments = contour.GetSegments();

        for (const [i, distance] of distances.entries()) {
            if (distance === 0) continue;

            const active = segments[i];
            const before = segments[(i - 1 + segments.length) % segments.length];
            const after = segments[(i + 1) % segments.length];

            const before_tmax = before.GetTMax();
            const before_tmin = before.GetTMin();
            const after_tmin = after.GetTMin();
            const after_tmax = after.GetTMax();
            const before_pmax = point2point(before.GetLimitPoint(2));
            const after_pmin = point2point(after.GetLimitPoint(1))

            const before_tangent = vec2vec(before.Tangent(before_tmax), 1);
            const after_tangent = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
            const active_tangent_begin = vec2vec(active.Tangent(active.GetTMin()), 1);
            const active_tangent_end = vec2vec(active.Tangent(active.GetTMax()), 1);

            const alpha = before_tangent.angleTo(after_tangent);
            const beta = active_tangent_end.angleTo(after_tangent);
            const gamma = active_tangent_begin.angleTo(before_tangent.multiplyScalar(-1));

            const x = alpha + gamma - Math.PI / 2;
            const y = alpha + beta - Math.PI / 2;

            const before_distance = distance / Math.cos(y);
            const after_distance = distance / Math.cos(x);

            const before_ext_p = point2point(before_pmax.add(before_tangent.multiplyScalar(-before_distance)));
            const after_ext_p = point2point(after_pmin.add(after_tangent.multiplyScalar(after_distance)));

            const { t: before_ext_t } = before.NearPointProjection(before_ext_p, true);
            const { t: after_ext_t } = after.NearPointProjection(after_ext_p, true);
            const before_extended = before.Trimmed(before_tmin, before_ext_t, 1)!;
            const after_extended = after.Trimmed(after_ext_t, after_tmax, 1)!;

            const active_new = new c3d.Polyline3D([before_ext_p, after_ext_p], false);

            const outContour = new c3d.Contour3D();
            outContour.AddCurveWithRuledCheck(before_extended, 1e-6);
            outContour.AddCurveWithRuledCheck(active_new, 1e-6);
            outContour.AddCurveWithRuledCheck(after_extended, 1e-6);

            return new c3d.SpaceInstance(outContour);
        }
        return new c3d.SpaceInstance(new c3d.Contour3D());
    }

    get segmentAngles(): SegmentAngle[] {
        const result: SegmentAngle[] = [];
        const contour = this._contour;
        const segments = contour.GetSegments();
        for (const [i, segment] of segments.entries()) {
            const center = segment.GetCentre();
            const active_tangent_end = vec2vec(segment.Tangent(segment.GetTMax()), 1);
            const after = segments[(i + 1) % segments.length];
            const after_tmin = after.GetTMin();
            const after_tangent = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
            const normal = new THREE.Vector3();
            normal.crossVectors(active_tangent_end, after_tangent).cross(active_tangent_end).normalize();

            const { t } = segment.NearPointProjection(center, false);
            result.push({
                origin: point2point(center),
                normal,
            });
        }
        return result;
    }
}