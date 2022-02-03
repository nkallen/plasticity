import Command from "../../command/Command";
import { ValidationError } from '../../command/GeometryFactory';
import { PointPicker } from "../../command/PointPicker";
import { CurvePointSnap, CurveSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import { BridgeCurvesDialog } from "./BridgeCurvesDialog";
import BridgeCurvesFactory from "./BridgeCurvesFactory";
import CurveFactory from "./CurveFactory";


export class BridgeCurvesCommand extends Command {
    async execute(): Promise<void> {
        const factory = new BridgeCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selected = this.editor.selection.selected;

        const dialog = new BridgeCurvesDialog(factory, this.editor.signals);
        dialog.execute(params => {
            factory.update();
            dialog.render();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pointPicker = new PointPicker(this.editor);
        pointPicker.raycasterParams.Line2.threshold = 50;
        const line = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.style = 1;
        const { point: p1, info: { snap: snap1 } } = await pointPicker.execute().resource(this);
        if (!(snap1 instanceof CurveSnap || snap1 instanceof CurvePointSnap))
            throw new ValidationError();

        line.push(p1);
        factory.curve1 = snap1.view;
        factory.t1 = snap1.t(p1);

        line.push(p1);
        const { info: { snap: snap2 } } = await pointPicker.execute(({ point: p2, info: { snap: snap2 } }) => {
            line.last = p2;
            if (line.hasEnoughPoints)
                line.update();

            if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap))
                return;
            factory.curve2 = snap2.view;
            factory.t2 = snap2.t(p2);
            factory.update();
            dialog.render();
        }).resource(this);
        if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap))
            throw new ValidationError();
        line.cancel();

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}
