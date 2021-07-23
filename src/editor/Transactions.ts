import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import * as visual from "./VisualModel";
import c3d from '../../build/Release/c3d.node';

export default class Transactions {
    constructor(
        private readonly db: GeometryDatabase,
        signals: EditorSignals
    ) {
        signals.objectSelected.add(o => this.selected(o));
    }

    selected(object: visual.SpaceItem | visual.TopologyItem | visual.ControlPoint) {
        if (object instanceof visual.Item) {
            const model = this.db.lookup(object);
            for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
                const creator = model.GetCreator(i);
                if (creator === null) throw new Error("invalid precondition");
                switch (creator.IsA()) {
                    case c3d.CreatorType.ElementarySolid:
                        const es = creator.Cast<c3d.ElementarySolid>(c3d.CreatorType.ElementarySolid);
                        const control = es.GetBasisPoints();
                        for (let j = 0, ll = control.Count(); j < ll; j++) {
                            const pt = control.GetPoint(j);
                        }
                        break;
                }
            }
        } else {

        }
    }
}