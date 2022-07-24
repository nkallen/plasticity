import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { Quasimode } from "../../command/Quasimode";
import { HasSelection } from "../../selection/SelectionDatabase";
import { SelectionMode } from "../../selection/SelectionModeSet";
import { CancellablePromise } from "../../util/CancellablePromise";
import * as visual from "../../visual_model/VisualModel";
import { FilletDialog } from "./FilletDialog";
import { MultiFilletFactory } from './FilletFactory';
import { FilletSolidGizmo } from './FilletGizmo';
import { ChamferAndFilletKeyboardGizmo } from "./FilletKeyboardGizmo";

export class FilletSolidCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const fillet = new MultiFilletFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new ChamferAndFilletKeyboardGizmo(this.editor);
        const dialog = new FilletDialog(fillet, this.agent, this.editor.signals);
        let gizmo = new FilletSolidGizmo(fillet, this.editor, this.point);

        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);
        const quasiPicker = new ObjectPicker(this.editor, objectPicker.selection, 'viewport-selector[quasimode]');
        const quasimode = new Quasimode("modify-selection", this.editor, fillet, quasiPicker);

        dialog.execute(async (params) => {
            gizmo.toggle(fillet.mode);
            keyboard.toggle(fillet.mode);
            gizmo.render(params.distance1);
            await fillet.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        let g: CancellablePromise<void> | undefined;
        let p: CancellablePromise<HasSelection> | undefined;
        let q: CancellablePromise<void> | undefined;

        const stopPicker = () => { p?.finish(); p = undefined }
        const stopGizmo = () => { g?.finish(); g = undefined }
        const stopQuazimode = () => { q?.finish(); q = undefined }

        const startGizmo = () => {
            if (g !== undefined) {
                gizmo.showEdges();
                return;
            }
            gizmo = new FilletSolidGizmo(fillet, this.editor, this.point);
            g = gizmo.execute(async params => {
                keyboard.toggle(fillet.mode);
                gizmo.toggle(fillet.mode);
                dialog.toggle(fillet.mode);
                dialog.render();
                if (Math.abs(params.distance1) > 0) {
                    stopPicker();
                    startQuazimode();
                }
                await fillet.update();
            }).resource(this);
            gizmo.showEdges();
        }

        const startQuazimode = () => {
            if (q !== undefined) return;
            q = quasimode.execute(delta => {
                fillet.edges = [...quasiPicker.selection.selected.edges];
                gizmo.showEdges();
            }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.CurveEdge).resource(this);
        }

        const startPicker = ()  => {
            if (p !== undefined) return;
            p = objectPicker.execute(async delta => {
                fillet.edges = [...objectPicker.selection.selected.edges];
                startGizmo();
                fillet.update();
            }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.CurveEdge).resource(this);
            return p;
        }

        fillet.edges = [...this.editor.selection.selected.edges];
        if (fillet.edges.length > 0) startGizmo();

        if (this.agent == 'user') {
            dialog.prompt("Select edges", () => {
                stopQuazimode();
                startPicker();
                return p!;
            }, () => {
                stopGizmo();
                stopQuazimode();
                objectPicker.selection.selected.removeAll();
                fillet.edges = [];
                fillet.distance1 = fillet.distance2 = 0;
                dialog.render();
                fillet.update();
            })();
        }
        // fillet.start();

        const variable = new PointPicker(this.editor);
        const restriction = variable.restrictToEdges(fillet.edges);
        variable.raycasterParams.Line2.threshold = 200;
        variable.raycasterParams.Points.threshold = 50;
        keyboard.execute(async (s) => {
            switch (s) {
                case 'add':
                    const { point } = await variable.execute().resource(this);
                    const { view } = restriction.match;
                    const model = this.editor.db.lookupTopologyItem(view);
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

        await this.finished;

        const results = await fillet.commit() as visual.Solid[];
        this.editor.selection.selected.add(results);
    }
}
