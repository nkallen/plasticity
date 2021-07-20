import { EditorSignals } from "../editor/Editor";
import * as visual from "../editor/VisualModel";
import * as cmd from "./Command";
import { FooFactory, RegionFactory } from "./region/RegionFactory";

// FIXME rename region manager?

export default class ContourManager {
    constructor(
        private readonly editor: cmd.EditorLike,
        private readonly signals: EditorSignals
    ) {
        signals.contoursChanged.add(c => this.update(c));
    }

    async update(contour: visual.SpaceInstance<visual.Curve3D>) {
        const regions = this.editor.db.find(visual.PlaneInstance) as visual.PlaneInstance<visual.Region>[];
        for (const region of regions) this.editor.db.removeItem(region);

        const curves = this.editor.db.find(visual.SpaceInstance) as visual.SpaceInstance<visual.Curve3D>[];
        const factory = new FooFactory(this.editor.db, this.editor.materials, this.signals);
        factory.newCurve = contour;
        factory.curves = curves;
        try {
            await factory.commit();
        } catch(e) {
            console.warn(e);
        }
    }
}