import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { vec2vec } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';

export class ExtrudeSurfaceFactory extends GeometryFactory {
    direction!: THREE.Vector3;

    private _curve!: visual.SpaceInstance<visual.Curve3D>;
    model!: c3d.Curve3D;

    get curve() { return this._curve }
    set curve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        this.model = item.Cast<c3d.Curve3D>(item.IsA());
    }

    async calculate() {
        const { model, direction } = this;
        const result = c3d.ActionSurface.ExtrusionSurface(model, vec2vec(direction), true);
        return new c3d.SpaceInstance(result);
    }
}