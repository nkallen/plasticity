import * as c3d from '../../kernel/kernel';
import { composeMainName, unit } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory } from '../../command/GeometryFactory';

export interface ExtensionShellParams {
    distance: number;
    type: c3d.ExtensionType;
    lateralKind: c3d.LateralKind;
}

export default class ExtensionShellFactory extends GeometryFactory implements ExtensionShellParams {
    distance = 0;
    type = c3d.ExtensionType.tangent;
    lateralKind = c3d.LateralKind.prolong;

    private _solid!: visual.Solid;
    private model!: c3d.Solid;
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    private _faces!: visual.Face[];
    private faceModels!: c3d.Face[];
    set faces(faces: visual.Face[]) {
        this._faces = faces;
        this.faceModels = faces.map(face => this.db.lookupTopologyItem(face));
        this.solid = faces[0].parentItem;
    }

    private curveEdges!: c3d.CurveEdge[];
    private _edges!: visual.CurveEdge[];
    set edges(edges: visual.CurveEdge[]) {
        const curveEdges = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge) as c3d.CurveEdge;
            curveEdges.push(model);
        }
        this.curveEdges = curveEdges;
        this._edges = edges;
    }

    async calculate() {
        const { model: solid, faceModels: faces, distance, type, lateralKind } = this;
        let { curveEdges: edges, } = this;

        const offsetParams = new c3d.SweptValues();
        offsetParams.shellClosed = false;
        const offsetNames = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ExtensionShell, this.db.version), c3d.ESides.SideNone, 0);
        const offset = await c3d.ActionShell.OffsetShell_async(solid, c3d.CopyMode.Copy, faces, true, offsetParams, offsetNames, true);

        // if (edges.length === 0) {
            edges = offset.GetShell()!.GetBoundaryEdges()
        // }

        const params = new c3d.ExtensionValues();
        params.InitByDistance(type, lateralKind, new c3d.Vector3D(0, 0, 0), unit(distance));
        const extensionNames = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ExtensionShell, this.db.version), c3d.ESides.SideNone, 0);
        return c3d.ActionShell.ExtensionShell_async(offset, c3d.CopyMode.Copy, offset.GetFace(0)!, edges, params, extensionNames);
    }
}
