import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { CornerAngle, inst2curve, normalizeCurve } from '../../util/Conversion';
import { GeometryFactory } from "../../command/GeometryFactory";
import { ContourFilletFactory, SegmentAngle } from "./ContourFilletFactory";
import { ModifyContourPointParams, MoveContourPointFactory } from "./ModifyContourPointFactory";
import { ModifyContourSegmentFactory, ModifyContourSegmentParams } from "./ModifyContourSegmentFactory";

type Mode = 'fillet' | 'offset' | 'change-point';

export interface ModifyContourParams extends ModifyContourSegmentParams, ModifyContourPointParams {
    mode: Mode;
    segmentAngles: SegmentAngle[];
    cornerAngles: CornerAngle[];
    radiuses: number[];
    move: THREE.Vector3;
}

export class ModifyContourFactory extends GeometryFactory implements ModifyContourParams {
    mode: Mode = 'offset';

    private readonly segments = new ModifyContourSegmentFactory(this.db, this.materials, this.signals);
    private readonly fillets = new ContourFilletFactory(this.db, this.materials, this.signals);
    private readonly points = new MoveContourPointFactory(this.db, this.materials, this.signals);

    get radiuses() { return this.fillets.radiuses }
    set radiuses(radiuses: number[]) { this.fillets.radiuses = radiuses }
    get segmentAngles() { return this.segments.segmentAngles }
    get cornerAngles() { return this.fillets.cornerAngles }
    get distance() { return this.segments.distance }
    set distance(distance: number) { this.segments.distance = distance }
    get segment() { return this.segments.segment }
    set segment(segment: number) { this.segments.segment = segment }
    get controlPointInfo() { return this.points.controlPointInfo }
    set controlPoints(controlPoints: visual.ControlPoint[]) { this.points.controlPoints = controlPoints }
    set move(move: THREE.Vector3) { this.points.move = move }
    get move() { return this.points.move }

    async prepare(view: visual.SpaceInstance<visual.Curve3D>) {
        const inst = this.db.lookup(view);
        const curve = inst2curve(inst)!;
        const result = await normalizeCurve(curve);
        return result;
    }

    set contour(contour: visual.SpaceInstance<visual.Curve3D> | c3d.Contour3D) {
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

