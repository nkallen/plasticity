import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { RadialArrayFactory } from "./ArrayFactory";
import { ArrayKeyboardGizmo } from "./ArrayKeyboardGizmo";
import { RadialArrayDialog } from "./RadialArrayDialog";

export class RadialArrayCommand extends Command {
    async execute(): Promise<void> {
        const array = new RadialArrayFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        array.num1 = 1;
        array.num2 = 8;
        array.isAlongAxis = true;
        array.step2 = Math.PI / 4;

        const dialog = new RadialArrayDialog(array, this.editor.signals);

        dialog.execute(async params => {
            array.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const selected = await dialog.prompt("Select solids or curves", () => {
            const objectPicker = new ObjectPicker(this.editor);
            objectPicker.copy(this.editor.selection);
            const min = 1 - objectPicker.selection.selected.curves.size - objectPicker.selection.selected.solids.size;
            return objectPicker.execute(() => { }, min, Number.MAX_SAFE_INTEGER).resource(this)
        })();
        if (selected.solids.size > 0) array.solid = selected.solids.first;
        else if (selected.curves.size > 0) array.curve = selected.curves.first;

        bbox.setFromObject(array.object);
        const centroid = bbox.getCenter(new THREE.Vector3());

        const { point: p1, info: { constructionPlane, orientation, isOrthoMode } } = await dialog.prompt("Select center point", () => {
            const pointPicker = new PointPicker(this.editor);
            return pointPicker.execute().resource(this);
        })();

        const keyboard = new ArrayKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'add':
                    array.num2++;
                    break;
                case 'subtract':
                    array.num2--;
                    break;
            }
            dialog.render();
            array.update();
        }).resource(this);

        const step1 = centroid.sub(p1);
        array.step1 = step1.length();
        array.dir1 = step1.normalize();
        array.dir2 = isOrthoMode
            ? constructionPlane.n.clone().normalize()
            : normal.set(0, 0, 1).applyQuaternion(orientation);
        array.center = p1;

        dialog.render();
        await array.update();

        await this.finished;

        const items = await array.commit();
        this.editor.selection.selected.add(items);
    }
}

const normal = new THREE.Vector3(0, 0, 1);
const bbox = new THREE.Box3();
