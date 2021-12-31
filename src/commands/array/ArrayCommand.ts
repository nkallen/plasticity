import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { ArrayFactory } from "./ArrayFactory";
import { RadialArrayDialog } from "./RadialArrayDialog";



export class RadialArrayCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;

        const factory = new ArrayFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.isPolar = true;
        factory.solid = solid;
        factory.num1 = 1;
        factory.num2 = 8;
        factory.isAlongAxis = true;
        factory.step2 = Math.PI / 4;

        const dialog = new RadialArrayDialog(factory, this.editor.signals);

        let pointPicker = new PointPicker(this.editor);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);

        const bbox = new THREE.Box3();
        bbox.setFromObject(solid);
        const centroid = bbox.getCenter(new THREE.Vector3());

        centroid.sub(p1);
        factory.step1 = centroid.length();
        factory.dir1 = centroid.normalize();
        factory.dir2 = constructionPlane.n.clone().normalize();
        factory.center = p1;

        await factory.update();

        dialog.execute(async (params) => {
            factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;

        await factory.commit();
    }
}
