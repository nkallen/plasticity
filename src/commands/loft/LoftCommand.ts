import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import Command from "../../command/Command";
import { FilletMagnitudeGizmo } from '../fillet/FilletGizmo';
import LoftFactory from "./LoftFactory";



export class LoftCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const loft = new LoftFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        loft.curves = curves;
        await loft.update();
        const spine = loft.spine;

        // const curve = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        // curve.type = c3d.SpaceType.Bezier3D;
        // for (const { point, Z } of spine) {
        //     curve.points.push(point);
        // }
        // await curve.update();
        const { point, Z } = spine[0];
        const gizmo = new FilletMagnitudeGizmo("loft:thickness", this.editor);
        gizmo.position.copy(point);
        gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), Z);
        await gizmo.execute(async (thickness) => {
            loft.thickness = thickness;
            loft.update();
        }, Mode.Persistent).resource(this);

        // curve.cancel();
        await loft.commit();
    }
}
