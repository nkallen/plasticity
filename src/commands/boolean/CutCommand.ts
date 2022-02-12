import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import * as visual from "../../visual_model/VisualModel";
import { CutDialog } from "./CutDialog";
import { MultiCutFactory } from "./CutFactory";
import { CutGizmo } from "./CutGizmo";


export class CutCommand extends Command {
    async execute(): Promise<void> {
        const cut = new MultiCutFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const gizmo = new CutGizmo(cut, this.editor);
        const dialog = new CutDialog(cut, this.editor.signals);
        let objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);

        dialog.execute(async (params) => {
            await cut.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(async (params) => {
            await cut.update();
        }).resource(this);

        GetTargetBodies: {
            const getTarget = dialog.prompt("Select target bodies", () => {
                return objectPicker.slice(SelectionMode.Solid, 1, Number.MAX_SAFE_INTEGER).resource(this);
            });
            const solids = await getTarget();
            cut.solids = [...solids];

            dialog.replace("Select target bodies", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.selection.selected.add(cut.solids);
                return objectPicker.execute(delta => {
                    const solids = [...objectPicker.selection.selected.solids];
                    cut.solids = solids;
                    cut.update();
                }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this);
            }, () => {
                cut.solids = [];
                cut.update();
            });
        }

        GetCutters: {
            cut.curves = [...this.editor.selection.selected.curves];
            cut.surfaces = [...this.editor.selection.selected.faces];
            await cut.update();

            dialog.prompt("Select cutters", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.mode.set(SelectionMode.Curve, SelectionMode.Face);
                objectPicker.selection.selected.add(cut.faces);
                objectPicker.selection.selected.add(cut.curves);
                return objectPicker.execute(async (delta) => {
                    const selected = objectPicker.selection.selected;
                    cut.surfaces = [...selected.faces];
                    cut.curves = [...selected.curves];
                    cut.update();
                }, 1, Number.MAX_SAFE_INTEGER).resource(this);
            }, () => {
                cut.surfaces = []; cut.curves = [];
                cut.update();
            })();
        }

        objectPicker = new ObjectPicker(this.editor);
        objectPicker.mode.set(SelectionMode.Face, SelectionMode.Curve);

        await this.finished;

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}
