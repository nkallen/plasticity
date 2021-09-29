import { DatabaseLike } from "../../editor/GeometryDatabase";
import MaterialDatabase from "../../editor/MaterialDatabase";
import { SnapManager } from "../../editor/snaps/SnapManager";
import { SnapPresenter } from "../../editor/snaps/SnapPresenter";
import { CancellablePromise } from "../../util/Cancellable";
import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import { ScaleCommand } from "../GeometryCommands";
import LineFactory from "../line/LineFactory";
import { PointPicker } from "../PointPicker";
import { ScaleDialog } from "./ScaleDialog";
import { ScaleGizmo } from "./ScaleGizmo";
import { ScaleFactory } from "./TranslateFactory";
import * as THREE from "three";

interface EditorLike extends cmd.EditorLike {
    db: DatabaseLike,
    materials: MaterialDatabase,
    snaps: SnapManager,
    snapPresenter: SnapPresenter,
}

const X = new THREE.Vector3(1, 0, 0);

export class ScaleKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('scale', editor, [
            'gizmo:scale:free',
        ]);
    }

    prepare(gizmo: ScaleGizmo, scale: ScaleFactory, dialog: ScaleDialog, cmd: ScaleCommand): CancellablePromise<void> {
        const editor = this.editor as EditorLike;
        return this.execute(async s => {
            switch (s) {
                case 'free':
                    gizmo.visible = false;
                    const referenceLine = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    const pointPicker = new PointPicker(editor);
                    console.log("begin");
                    const { point: p1 } = await pointPicker.execute().resource(cmd);
                    console.log("end");
                    referenceLine.p1 = p1;
                    scale.pivot = p1;
                    const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
                        referenceLine.p2 = p2;
                        referenceLine.update();
                    }).resource(cmd);
                    const reference = p2.clone().sub(p1);
                    const referenceMagnitude = reference.length();
                    reference.divideScalar(referenceMagnitude);

                    const transformationLine = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    transformationLine.p1 = p1;
                    const quat = new THREE.Quaternion().setFromUnitVectors(X, reference);
                    const inv = quat.clone().invert();
                    
                    pointPicker.restrictToLine(p1, reference);
                    await pointPicker.execute(({ point: p3 }) => {
                        transformationLine.p2 = p3;
                        transformationLine.update();
                        
                        const mag = p3.distanceTo(p1) / referenceMagnitude;
                        scale.scale.set(1,1,1).applyQuaternion(inv);
                        scale.scale.x *= mag;
                        scale.scale.applyQuaternion(quat);

                        scale.update();
                        dialog.render();
                        gizmo.render(scale);
                    }).resource(cmd);

                    transformationLine.cancel();
                    referenceLine.cancel();
                    gizmo.visible = true;
            }
        })
    }
}