import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { PhantomLineFactory } from "../line/LineFactory";
import { RevolutionDialog } from "./RevolutionDialog";
import { RevolutionFactory } from "./RevolutionFactory";
import { RevolutionGizmo } from "./RevolutionGizmo";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class RevolutionCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const curves = [...editor.selection.selected.curves];
        const regions = [...editor.selection.selected.regions];
        const revolution = new RevolutionFactory(editor.db, editor.materials, editor.signals).resource(this);
        revolution.regions = regions;
        revolution.curves = curves;

        const dialog = new RevolutionDialog(revolution, editor.signals);
        const gizmo = new RevolutionGizmo(revolution, editor);

        dialog.execute(async (params) => {
            await revolution.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        revolution.origin = p1;

        const line = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        line.p1 = p1;

        await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
            revolution.axis = p2.clone().sub(p1).normalize();
            revolution.update();
        }).resource(this);
        line.cancel();

        gizmo.quaternion.setFromUnitVectors(Z, revolution.axis);
        gizmo.position.copy(revolution.origin);
        gizmo.execute(params => {
            revolution.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const revolved = await revolution.commit();
        editor.selection.selected.add(revolved);
    }
}
