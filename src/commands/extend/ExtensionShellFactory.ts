import c3d from '../../../build/Release/c3d.node';
import { composeMainName } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export default class ExtensionShellFactory extends GeometryFactory {
    private _solid!: visual.Solid;
    private model!: c3d.Solid;
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.model = this.db.lookup(solid);
    }

    private _face!: visual.Face;
    private faceModel!: c3d.Face;
    set face(face: visual.Face) {
        this._face = face;
        this.faceModel = this.db.lookupTopologyItem(face);
        this.solid = face.parentItem;
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
    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.ExtensionShell, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { model: solid, faceModel: face, names, curveEdges: edges } = this;
        const params = new c3d.ExtensionValues();
        params.InitByDistance(c3d.ExtensionType.same, c3d.LateralKind.normal, new c3d.Vector3D(0, 0, 0), 10);
        return c3d.ActionShell.ExtensionShell(solid, c3d.CopyMode.Copy, face, edges, params, names);
    }
}
