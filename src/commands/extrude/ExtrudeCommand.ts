import * as THREE from "three";
import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { BooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { ExtrudeDialog } from "./ExtrudeDialog";
import { MultiExtrudeFactory } from "./ExtrudeFactory";
import { ExtrudeGizmo } from "./ExtrudeGizmo";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class ExtrudeRegionCommand {

}

export class ExtrudeFaceCommand {

}

export class ExtrudeCurveCommand {

}

export class ExtrudeCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const extrude = new MultiExtrudeFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extrude.regions = [...selected.regions];
        extrude.solid = selected.solids.first;
        // extrude.curves = [...selected.curves];
        // if (selected.faces.size > 0) extrude.face = selected.faces.first;
        const gizmo = new ExtrudeGizmo(extrude, this.editor);
        const keyboard = new BooleanKeyboardGizmo("extrude", this.editor);
        const dialog = new ExtrudeDialog(extrude, this.editor.signals);

        keyboard.prepare(extrude).resource(this);

        gizmo.position.copy(this.point ?? extrude.center);
        gizmo.quaternion.setFromUnitVectors(Y, extrude.direction);

        gizmo.execute(params => {
            extrude.update();
            keyboard.toggle(extrude.isOverlapping);
            dialog.render();
        }).resource(this);

        dialog.execute(params => {
            extrude.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;

        const results = await extrude.commit() as visual.Solid[];
        selected.add(results);
        const extruded = extrude.extruded;
        if (!(extruded instanceof visual.Face)) selected.remove(extruded);
    }
}
