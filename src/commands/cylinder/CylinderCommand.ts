import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import { PossiblyBooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { CenterCircleFactory } from '../circle/CircleFactory';
import { EditCylinderFactory, PossiblyBooleanCylinderFactory } from './CylinderFactory';
import { EditCylinderGizmo } from "./CylinderGizmo";
import { EditCylinderDialog } from "./EditCylinderDialog";

const Z = new THREE.Vector3(0, 0, 1);

export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const cylinder = new PossiblyBooleanCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        cylinder.targets = [...selection.solids];

        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let pointPicker = new PointPicker(this.editor);
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

        cylinder.base = p1;
        cylinder.radius = p2;

        const keyboard = new PossiblyBooleanKeyboardGizmo("cylinder", this.editor);
        keyboard.prepare(cylinder).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(...snap.additionalSnapsFor(p1));
        pointPicker.addAxesAt(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.height = p3;
            cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        const results = await cylinder.commit() as visual.Solid[];
        selection.add(results);

        const next = new EditCylinderCommand(this.editor);
        next.cylinder = results[0];
        this.editor.enqueue(next, false);
    }
}

export class EditCylinderCommand extends Command {
    cylinder!: visual.Solid;
    remember = false;

    async execute(): Promise<void> {
        const edit = new EditCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        edit.cylinder = this.cylinder;

        const dialog = new EditCylinderDialog(edit, this.editor.signals);
        const gizmo = new EditCylinderGizmo(edit, this.editor);

        dialog.execute(params => {
            gizmo.render(params);
            edit.update();
        }).rejectOnInterrupt().resource(this);

        gizmo.quaternion.setFromUnitVectors(Z, edit.axis);
        gizmo.position.copy(edit.p0);
        gizmo.execute(async (params) => {
            dialog.render();
            await edit.update();
        }).resource(this);

        await this.finished;

        const result = await edit.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
    }
}
