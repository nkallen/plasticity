import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import OffsetCurveFactory from "./OffsetContourFactory";
import { OffsetCurveGizmo } from "./OffsetCurveGizmo";
import { Y } from './CurveCommand';


export class OffsetCurveCommand extends Command {
    async execute(): Promise<void> {
        const face = this.editor.selection.selected.faces.first;
        const curve = this.editor.selection.selected.curves.first;
        const edges = this.editor.selection.selected.edges;

        const offsetContour = new OffsetCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        offsetContour.constructionPlane = this.editor.activeViewport?.constructionPlane;
        if (face !== undefined)
            offsetContour.face = face;
        if (curve !== undefined)
            offsetContour.curve = curve;
        if (edges.size > 0)
            offsetContour.edges = [...edges];

        const gizmo = new OffsetCurveGizmo(offsetContour, this.editor);
        gizmo.position.copy(offsetContour.center);
        gizmo.quaternion.setFromUnitVectors(Y, offsetContour.normal);
        gizmo.relativeScale.setScalar(0.8);

        gizmo.execute(d => {
            offsetContour.update();
        }).resource(this);
        gizmo.start('gizmo:offset-curve:distance');

        await this.finished;

        if (face !== undefined)
            this.editor.selection.selected.removeFace(face);
        if (curve !== undefined)
            this.editor.selection.selected.removeCurve(curve);

        const offset = await offsetContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(offset);
    }
}
