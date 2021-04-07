import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

abstract class BooleanFactory extends GeometryFactory {
    protected abstract operationType: c3d.OperationType;

    item1!: visual.Solid;
    item2!: visual.Solid;

    commit() {
        let model1 = this.db.lookup(this.item1);
        let model2 = this.db.lookup(this.item2);

        const names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);

        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(true);
        flags.SetMergingEdges(true);

        const result = c3d.ActionSolid.BooleanResult(model1, c3d.CopyMode.KeepHistory, model2, c3d.CopyMode.KeepHistory, this.operationType, flags, names);

        this.db.removeItem(this.item1);
        this.db.removeItem(this.item2);

        this.db.addItem(result);

        return super.commit();
    }

    cancel() {
    }
}
export class UnionFactory extends BooleanFactory {
    operationType = c3d.OperationType.Union;
}

export class IntersectionFactory extends BooleanFactory {
    operationType = c3d.OperationType.Intersect;
}

export class DifferenceFactory extends BooleanFactory {
    operationType = c3d.OperationType.Difference;
}

export class CutFactory extends GeometryFactory {
    solid!: visual.Solid;
    contour!: visual.SpaceInstance<visual.Curve3D>;

    commit() {
        const solid = this.db.lookup(this.solid);
        const instance = this.db.lookup(this.contour);
        const item = instance.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d, placement } = curve.GetPlaneCurve(false);
        const contour = new c3d.Contour([curve2d], true);

        const names = new c3d.SNameMaker(c3d.CreatorType.CuttingSolid, c3d.ESides.SideNone, 0);

        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);
        const result0 = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, placement, contour, direction, -1, names, true, flags);
        const result1 = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.KeepHistory, placement, contour, direction, 1, names, true, flags);

        this.db.removeItem(this.solid);
        this.db.removeItem(this.contour);
        this.db.addItem(result0);
        this.db.addItem(result1);

        return super.commit();
    }
}