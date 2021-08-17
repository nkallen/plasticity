import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from '../../editor/SnapManager';
import * as visual from '../../editor/VisualModel';
import { curve3d2curve2d } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

abstract class BooleanFactory extends GeometryFactory {
    protected abstract operationType: c3d.OperationType;

    private _item1!: visual.Solid;
    private model1!: c3d.Solid;
    get item1() { return this._item1 }
    set item1(item1: visual.Solid) {
        this._item1 = item1;
        this.model1 = this.db.lookup(item1)
    }

    private _item2!: visual.Solid;
    private model2!: c3d.Solid;
    get item2() { return this._item2 }
    set item2(item2: visual.Solid) {
        this._item2 = item2;
        this.model2 = this.db.lookup(item2)
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);

    async computeGeometry() {
        const { model1, model2, names } = this;

        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(true);
        flags.SetMergingEdges(true);

        const result = await c3d.ActionSolid.BooleanResult_async(model1, c3d.CopyMode.Copy, model2, c3d.CopyMode.Copy, this.operationType, flags, names);
        return result;
    }

    get originalItem() {
        return [this.item1, this.item2];
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

    names = new c3d.SNameMaker(c3d.CreatorType.CuttingSolid, c3d.ESides.SideNone, 0);

    contour!: c3d.Contour;
    placement!: c3d.Placement3D;

    constructionPlane?: PlaneSnap;

    set curve(inst: visual.SpaceInstance<visual.Curve3D>) {
        const instance = this.db.lookup(inst);
        const item = instance.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const planar = curve3d2curve2d(curve3d, this.constructionPlane?.placement ?? new c3d.Placement3D());
        if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
        const { curve: curve2d, placement } = planar;
        
        this.contour = new c3d.Contour([curve2d], true);
        this.placement = placement;
    }

    async computeGeometry() {
        const { db, contour, placement, names } = this;

        const solid = db.lookup(this.solid);

        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);
        const result0 = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, placement, contour, direction, -1, names, true, flags);
        const result1 = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, placement, contour, direction, 1, names, true, flags);

        return [result0, result1];
    }

    get originalItem() { return this.solid }
}