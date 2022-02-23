import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { RectangularArrayFactory } from "./ArrayFactory";
import { ArrayKeyboardGizmo } from "./ArrayKeyboardGizmo";
import { RectangularArrayDialog } from "./RectangularArrayDialog";

export class RectangularArrayCommand extends Command {
    async execute(): Promise<void> {
        const array = new RectangularArrayFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        array.num1 = 8;
        array.num2 = 1;
        array.isAlongAxis = true;

        const dialog = new RectangularArrayDialog(array, this.editor.signals);

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

        const step1 = new THREE.Vector3();
        await dialog.prompt("Select endpoint 1", () => {
            const pointPicker = new PointPicker(this.editor);
            pointPicker.addAxesAt(centroid);
            return pointPicker.execute(async ({ point, info: { constructionPlane } }) => {
                step1.copy(point).sub(centroid);
                array.step1 = step1.length() / (array.num1 - 1);
                array.dir1 = step1.normalize();
                array.dir2 = constructionPlane.n.clone().normalize().cross(step1);
                array.center = point;
                await array.update();
                dialog.render();
            }).resource(this);
        })();

        const step2 = new THREE.Vector3();
        dialog.prompt("Select endpoint 2", () => {
            const pointPicker = new PointPicker(this.editor);
            pointPicker.addAxesAt(centroid);
            return pointPicker.execute(async ({ point, info: { constructionPlane } }) => {
                step2.copy(point).sub(centroid);
                array.step2 = step2.length() / array.num2;
                array.dir2 = step2.normalize();
                await array.update();
                dialog.render();
            }).resource(this);
        });

        const keyboard = new ArrayKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'add':
                    array.num1++;
                    break;
                case 'subtract':
                    array.num1--;
                    break;
            }
            dialog.render();
            array.update();
        }).resource(this);

        await this.finished;

        const items = await array.commit();
        this.editor.selection.selected.add(items);
    }
}

const bbox = new THREE.Box3();
