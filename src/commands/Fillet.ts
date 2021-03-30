import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import { Item, CurveEdge } from '../VisualModel';

export default class FilletFactory extends GeometryFactory {
    item!: Item;
    edges!: CurveEdge[];

    commit() {
        this.editor.removeObject(this.item);
        console.log(this.item);

        let solid = this.editor.lookupItem(this.item);
        if (solid.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";
        solid = solid.Cast<c3d.Solid>(c3d.SpaceType.Solid);

        const params = new c3d.SmoothValues();
        params.distance1 = 0.1;
        params.distance2 = 0.2;
        params.form = 0;
        params.conic = 0;
        params.prolong = false;
        params.smoothCorner = 2;
        params.keepCant = -1;
        params.strict = true;

        const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);

        const curves = [];
        for (const edge of this.edges) {
            curves.push(this.editor.lookupTopologyItem(edge));
        }
        console.log(curves);

        const result = c3d.ActionSolid.FilletSolid(solid, c3d.CopyMode.KeepHistory, curves, [], params, names);
        this.editor.addObject(result);
    }

    cancel() {
    }
}