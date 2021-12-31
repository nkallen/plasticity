import * as THREE from "three";
import Command from "../../command/Command";
import { MultilineCommand } from "../curve/CurveCommand";
import { FilletMagnitudeGizmo } from '../fillet/FilletGizmo';
import { OffsetFaceGizmo } from "../modifyface/OffsetFaceGizmo";
import { ThinSolidDialog } from "./ThinSolidDialog";
import { ThinSolidFactory } from "./ThinSolidFactory";



export class ShellCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0 || selected.faces.size > 0) {
            const command = new ThinSolidCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.curves.size > 0) {
            const command = new MultilineCommand(this.editor);
            this.editor.enqueue(command, true);
        }
    }
}

export class ThinSolidCommand extends Command {
    async execute(): Promise<void> {
        const thin = new ThinSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let face;
        if (this.editor.selection.selected.faces.size > 0) {
            const faces = [...this.editor.selection.selected.faces];
            face = faces[0];
            const solid = face.parentItem;
            thin.solid = solid;
            thin.faces = faces;
        } else {
            const solid = this.editor.selection.selected.solids.first;
            thin.solid = solid;
            face = solid.faces.get(0);
        }

        const gizmo = new FilletMagnitudeGizmo("thin-solid:thickness", this.editor);
        const dialog = new ThinSolidDialog(thin, this.editor.signals);

        dialog.execute(async (params) => {
            gizmo.render(params.thickness1);
            await thin.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const { point, normal } = OffsetFaceGizmo.placement(this.editor.db.lookupTopologyItem(face));
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        gizmo.position.copy(point);

        gizmo.execute(thickness => {
            thin.thickness1 = thickness;
            dialog.render();
            thin.update();
        }).resource(this);

        await this.finished;

        await thin.commit();
    }
}
