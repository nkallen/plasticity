import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory, PhantomInfo } from '../../command/GeometryFactory';
import { MaterialOverride } from "../../editor/DatabaseLike";
import { BooleanLikeFactory, phantom_red, phantom_green, phantom_blue } from "./BooleanFactory";

export abstract class PossiblyBooleanFactory<GF extends GeometryFactory> extends GeometryFactory {
    protected abstract bool: BooleanLikeFactory;
    protected abstract fantom: GF;

    newBody = false;

    protected _operationType?: c3d.OperationType;
    get operationType() { return this._operationType ?? this.defaultOperationType; }
    set operationType(operationType: c3d.OperationType) { this._operationType = operationType; }
    get defaultOperationType() { return this.isSurface ? c3d.OperationType.Union : c3d.OperationType.Difference; }

    private _targets: { views: visual.Solid[], models: c3d.Solid[] } = { views: [], models: [] };
    get targets() { return this._targets.views }
    set targets(targets: visual.Solid[]) {
        const models = targets.map(t => this.db.lookup(t));
        this._targets = { views: targets, models };
        this.bool.targets = targets;
    }

    protected _isOverlapping = false;
    get isOverlapping() { return this._isOverlapping; }
    set isOverlapping(isOverlapping: boolean) {
        this._isOverlapping = isOverlapping;
        this.bool.isOverlapping = isOverlapping;
    }

    protected _isSurface = false;
    get isSurface() { return this._isSurface; }
    set isSurface(isSurface: boolean) {
        this._isSurface = isSurface;
        this.bool.isSurface = isSurface;
    }

    private async beforeCalculate(fast = false) {
        const phantom = await this.fantom.calculate() as c3d.Solid;
        let isOverlapping, isSurface;
        if (this.targets.length === 0) {
            isOverlapping = false;
            isSurface = false;
        } else {
            const cube1 = phantom.GetCube();
            const possible = [];
            for (const model of this._targets.models) {
                const cube2 = model.GetCube();
                if (cube1.Intersect(cube2)) {
                    possible.push(model);
                }
            }
            if (possible.length === 0) {
                isOverlapping = false;
                isSurface = false;
            } else {
                const names = new c3d.SNameMaker(0, c3d.ESides.SideNone, 0);
                const promises = possible.map(p => c3d.Action.IsSolidsIntersectionFast_async(p, phantom, names));
                const intersections = await Promise.all(promises);
                isOverlapping = intersections.some(x => x);
                isSurface = false;
            }
        }
        return { phantom, isOverlapping, isSurface };
    }

    async calculate() {
        const { phantom, isOverlapping, isSurface } = await this.beforeCalculate();
        this.isOverlapping = isOverlapping; this.isSurface = isSurface;

        if (isOverlapping && !this.newBody) {
            this.bool.operationType = this.operationType;
            this.bool.tool = phantom;
            const result = await this.bool.calculate() as c3d.Solid[];
            return result;
        } else {
            return [phantom];
        }
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const phantom = await this.fantom.calculate() as c3d.Solid;
        const isOverlapping = this.isOverlapping;

        if (this.targets.length === 0)
            return [];
        if (this.newBody)
            return [];
        if (this.operationType === c3d.OperationType.Union)
            return [];
        if (!isOverlapping)
            return [];

        let material: MaterialOverride;
        if (this.operationType === c3d.OperationType.Difference)
            material = phantom_red;
        else if (this.operationType === c3d.OperationType.Intersect)
            material = phantom_green;
        else
            material = phantom_blue;

        return [{ phantom, material }];
    }

    get originalItem() { return this.targets }

    get shouldRemoveOriginalItemOnCommit() {
        return this.isOverlapping && this.targets.length !== 0 && !this.newBody;
    }
}
