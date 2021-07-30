import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class TrimFactory extends GeometryFactory {
    private curve!: c3d.Curve3D;
    private info!: visual.FragmentInfo;

    set fragment(fragment: visual.SpaceInstance<visual.Curve3D>) {
        const info = fragment.underlying.fragmentInfo;
        if (info === undefined) throw new Error("invalid precondition");
        this.info = info;

        const model = this.db.lookup(info.untrimmedAncestor);
        const item = model.GetSpaceItem()!;
        this.curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    }

    protected async computeGeometry() {
        const { curve, info: {start, stop} } = this;

        const result = [];

        if (!curve.IsClosed()) {
            let from = curve.GetTMin(), to = start;
            if (Math.abs(from - to) > 10e-4) {
                const beginning = curve.Trimmed(from, to, 1)!;
                result.push(new c3d.SpaceInstance(beginning));
            }
            from = stop, to = curve.GetTMax();
            if (Math.abs(from - to) > 10e-4) {
                const ending = curve.Trimmed(from, to, 1)!;
                result.push(new c3d.SpaceInstance(ending));
            }
        } else {
            if (Math.abs(stop - start) > 10e-4) {
                const ending = curve.Trimmed(stop, start, 1)!;
                result.push(new c3d.SpaceInstance(ending));
            }
        }
        return result;
    }

    get originalItem() { return this.info.untrimmedAncestor }
}