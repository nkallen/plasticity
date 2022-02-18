import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { MagnitudeGizmo } from "../extrude/ExtrudeGizmo";
import { LoftDialog } from "./LoftDialog";
import LoftFactory from "./LoftFactory";

export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        loft.curves = curves;

        const gizmo = new MagnitudeGizmo("loft:thickness", this.editor);
        const dialog = new LoftDialog(loft, this.editor.signals);

        dialog.execute(async (params) => {
            await loft.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        GetSpine: {
            dialog.prompt("Select spine", () => {
                const objectPicker = new ObjectPicker(this.editor);
                return objectPicker.execute(delta => {
                    const spine = objectPicker.selection.selected.curves.first;
                    loft.spine = spine;
                    loft.update();
                }, 1, 1, SelectionMode.Curve).resource(this);
            });
        }

        await loft.update();

        const spine = loft.info;
        const { point, Z } = spine[0];
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), Z);
        await gizmo.execute(async thickness => {
            loft.thickness = thickness;
            loft.update();
        }, Mode.Persistent).resource(this);

        await loft.commit();
    }
}
