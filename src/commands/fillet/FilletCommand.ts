import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/PointPicker";
import { Quasimode } from "../../command/Quasimode";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import * as visual from "../../visual_model/VisualModel";
import { FilletDialog } from "./FilletDialog";
import { MultiFilletFactory } from './FilletFactory';
import { FilletSolidGizmo } from './FilletGizmo';
import { ChamferAndFilletKeyboardGizmo } from "./FilletKeyboardGizmo";

export class FilletSolidCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const edges = [...this.editor.selection.selected.edges];

        const fillet = new MultiFilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        fillet.edges = edges;

        const gizmo = new FilletSolidGizmo(fillet, this.editor, this.point);
        const keyboard = new ChamferAndFilletKeyboardGizmo(this.editor);
        const dialog = new FilletDialog(fillet, this.editor.signals);

        const objectPicker = new ObjectPicker(this.editor, this.editor.selection, 'viewport-selector[quasimode]');
        objectPicker.mode.set(SelectionMode.CurveEdge);
        objectPicker.max = Number.MAX_SAFE_INTEGER;
        const quasimode = new Quasimode("modify-selection", this.editor, fillet, objectPicker);

        gizmo.showEdges();

        dialog.execute(async (params) => {
            gizmo.toggle(fillet.mode);
            keyboard.toggle(fillet.mode);
            gizmo.render(params.distance1);
            await fillet.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const variable = new PointPicker(this.editor);
        const restriction = variable.restrictToEdges(edges);
        variable.raycasterParams.Line2.threshold = 300;
        variable.raycasterParams.Points.threshold = 50;
        keyboard.execute(async (s) => {
            switch (s) {
                case 'add':
                    const { point } = await variable.execute().resource(this);
                    const { model, view } = restriction.match;
                    const t = restriction.match.t(point);
                    const fn = fillet.functions.get(view.simpleName)!;
                    const added = gizmo.addVariable(point, model, t);
                    added.execute(async (delta) => {
                        fn.InsertValue(t, delta);
                        await fillet.update();
                    }, Mode.Persistent).resource(this);
                    break;
            }
        }).resource(this);

        gizmo.execute(async (params) => {
            keyboard.toggle(fillet.mode);
            gizmo.toggle(fillet.mode);
            dialog.toggle(fillet.mode);
            dialog.render();
            await fillet.update();
        }).resource(this);

        quasimode.execute(selection => {
            fillet.edges = [...selection.edges];
            gizmo.showEdges();
        }).resource(this)

        await this.finished;

        const results = await fillet.commit() as visual.Solid[];
        this.editor.selection.selected.add(results);
    }
}
