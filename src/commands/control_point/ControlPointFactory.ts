import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export class RemovePointFactory extends GeometryFactory {
    protected curve!: c3d.Curve3D;
    protected instance!: visual.SpaceInstance<visual.Curve3D>;

    _controlPoints!: visual.ControlPoint[];
    get controlPoints() { return this._controlPoints }
    set controlPoints(points: visual.ControlPoint[]) {
        if (points.length < 1) throw new ValidationError();
        this._controlPoints = points;
        const original = points[0].parentItem;
        const inst = this.db.lookup(points[0].parentItem);
        const curve = inst2curve(inst)!;
        this.curve = curve;
        this.instance = original;
    }
    
    async calculate() {
        const { controlPoints, curve } = this;
        if (!(curve instanceof c3d.PolyCurve3D)) throw new ValidationError("");

        for (const point of controlPoints) {
            curve.RemovePoint(point.index);
        }

        return new c3d.SpaceInstance(curve);
    }

    get originalItem() {
        return this.instance;
    }
}