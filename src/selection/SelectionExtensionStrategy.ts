import { DatabaseLike } from "../editor/DatabaseLike";
import { Intersectable } from "../visual_model/Intersectable";
import * as visual from '../visual_model/VisualModel';
import * as c3d from '../kernel/kernel';

export class SelectionExtensionStrategy {
    constructor(protected readonly db: DatabaseLike) { }

    extendEdge(edge: visual.CurveEdge, hint: ReadonlySet<Intersectable>) {
        const model = this.db.lookupTopologyItem(edge);
        const parentItem = edge.parentItem;
        const simpleName = parentItem.simpleName;
        const parent = this.db.lookup(parentItem);
        const plus = model.GetFacePlus();
        if (plus === null)
            return this.findLoop(model, parent, simpleName, false);
        const minus = model.GetFaceMinus()!;
        if (minus === null)
            return this.findLoop(model, parent, simpleName, true);

        const indexPlus = parent.GetFaceIndex(plus);
        const namePlus = visual.Face.simpleName(simpleName, indexPlus);
        let views = this.db.lookupTopologyItemById(namePlus).views;
        for (const view of views) {
            if (hint.has(view))
                return this.findLoop(model, parent, simpleName, true);
        }

        const indexMinus = parent.GetFaceIndex(minus);
        const nameMinus = visual.Face.simpleName(simpleName, indexMinus);
        views = this.db.lookupTopologyItemById(nameMinus).views;
        for (const view of views) {
            if (hint.has(view))
                return this.findLoop(model, parent, simpleName, false);
        }

        return this.findLoop(model, parent, simpleName, true);
    }

    private findLoop(model: c3d.CurveEdge, parent: c3d.Solid, simpleName: c3d.SimpleName, side: boolean): visual.CurveEdge[] {
        const { success, findLoop } = side ? model.FindOrientedEdgePlus() : model.FindOrientedEdgeMinus();
        if (!success)
            return [];
        const edges = findLoop.GetEdges();
        const result = [];
        for (const edge of edges) {
            const index = parent.GetEdgeIndex(edge);
            const id = visual.CurveEdge.simpleName(simpleName, index);
            if (this.db.hasTopologyItem(id)) {
                const views = this.db.lookupTopologyItemById(id).views;
                const view = [...views][0] as visual.CurveEdge;
                result.push(view);
            }
        }
        return result;
    }
}
