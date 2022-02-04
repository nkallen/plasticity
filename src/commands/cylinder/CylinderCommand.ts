import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import * as visual from "../../visual_model/VisualModel";
import { PossiblyBooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { CenterCircleFactory } from '../circle/CircleFactory';
import { PossiblyBooleanCylinderFactory } from './CylinderFactory';
import { EditCylinderGizmo } from "./CylinderGizmo";
import { EditCylinderDialog } from "./EditCylinderDialog";

const Z = new THREE.Vector3(0, 0, 1);

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const cylinder = new PossiblyBooleanCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        cylinder.targets = [...selection.solids];

        const dialog = new EditCylinderDialog(cylinder, this.editor.signals);
        const gizmo = new EditCylinderGizmo(cylinder, this.editor);

        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = p1;
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const { point: p2 } = await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            circle.point = p2;
            circle.orientation = orientation;
            circle.update();
        }).resource(this);
        circle.cancel();

        cylinder.p0 = p1;
        cylinder.p1 = p2;

        const keyboard = new PossiblyBooleanKeyboardGizmo("cylinder", this.editor);
        keyboard.prepare(cylinder).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(...snap.additionalSnapsFor(p1));
        pointPicker.addAxesAt(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.p2 = p3;
            cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        dialog.execute(params => {
            gizmo.render(params);
            cylinder.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        dialog.prompt("Select target bodies", () => {
            const objectPicker = new ObjectPicker(this.editor);
            objectPicker.selection.selected.add(cylinder.targets);
            return objectPicker.execute(async delta => {
                const targets = [...objectPicker.selection.selected.solids];
                cylinder.targets = targets;
                await cylinder.update();
                keyboard.toggle(cylinder.isOverlapping);
            }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
        }, async () => {
            cylinder.targets = [];
            await cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        });

        gizmo.quaternion.setFromUnitVectors(Z, cylinder.axis);
        gizmo.position.copy(cylinder.p0);
        gizmo.execute(async (params) => {
            dialog.render();
            await cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        await this.finished;

        const results = await cylinder.commit() as visual.Solid[];
        selection.add(results);
    }
}
