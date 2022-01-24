import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/PointPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { ArrayFactory } from "./ArrayFactory";
import { RadialArrayDialog } from "./RadialArrayDialog";

export class RadialArrayCommand extends Command {
    async execute(): Promise<void> {
        const array = new ArrayFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        array.isPolar = true;
        array.num1 = 1;
        array.num2 = 8;
        array.isAlongAxis = true;
        array.step2 = Math.PI / 4;

        const dialog = new RadialArrayDialog(array, this.editor.signals);

        dialog.execute(async (params) => {
            array.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const solids = await dialog.prompt("Select solid", () => {
            const objectPicker = new ObjectPicker(this.editor);
            objectPicker.copy(this.editor.selection);
            return objectPicker.shift(SelectionMode.Solid, 1).resource(this)
        })();
        array.solid = solids.first;

        bbox.setFromObject(array.solid);
        const centroid = bbox.getCenter(new THREE.Vector3());

        const { point: p1, info: { constructionPlane } } = await dialog.prompt("Select center point", () => {
            const pointPicker = new PointPicker(this.editor);
            pointPicker.restrictToPlaneThroughPoint(centroid);
            return pointPicker.execute().resource(this);
        })();
        centroid.sub(p1);
        array.step1 = centroid.length();
        array.dir1 = centroid.normalize();
        array.dir2 = constructionPlane.n.clone().normalize();
        array.center = p1;

        await array.update();

        await this.finished;

        await array.commit();
    }
}

const bbox = new THREE.Box3();
