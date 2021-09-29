import * as THREE from "three";
import { DatabaseLike } from "../../editor/GeometryDatabase";
import MaterialDatabase from "../../editor/MaterialDatabase";
import { AxisSnap } from "../../editor/snaps/Snap";
import { SnapManager } from "../../editor/snaps/SnapManager";
import { SnapPresenter } from "../../editor/snaps/SnapPresenter";
import { CancellablePromise } from "../../util/Cancellable";
import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import { RotateCommand } from "../GeometryCommands";
import LineFactory from "../line/LineFactory";
import { PointPicker } from "../PointPicker";
import { RotateDialog } from "./RotateDialog";
import { RotateGizmo } from "./RotateGizmo";
import { RotateFactory } from "./TranslateFactory";

interface EditorLike extends cmd.EditorLike {
    db: DatabaseLike,
    materials: MaterialDatabase,
    snaps: SnapManager,
    snapPresenter: SnapPresenter,
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class RotateKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rotate', editor, [
            'gizmo:rotate:free',
        ]);
    }

    prepare(gizmo: RotateGizmo, rotate: RotateFactory, dialog: RotateDialog, cmd: RotateCommand): CancellablePromise<void> {
        const editor = this.editor as EditorLike;
        return this.execute(async s => {
            switch (s) {
                case 'free':
                    gizmo.visible = false;
                    const referenceLine = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    const pointPicker = new PointPicker(editor);
                    const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(cmd);
                    referenceLine.p1 = p1;
                    rotate.pivot = p1;
                    rotate.axis = constructionPlane.n;
                    pointPicker.restrictToPlaneThroughPoint(p1);
                    pointPicker.straightSnaps.delete(AxisSnap.Z);

                    const quat = new THREE.Quaternion().setFromUnitVectors(constructionPlane.n, Z);

                    const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
                        referenceLine.p2 = p2;
                        referenceLine.update();
                    }).resource(cmd);
                    const reference = p2.clone().sub(p1).applyQuaternion(quat);

                    const transformationLine = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    transformationLine.p1 = p1;

                    pointPicker.restrictToLine(p1, reference);
                    const transformation = new THREE.Vector3();
                    await pointPicker.execute(({ point: p3 }) => {
                        transformationLine.p2 = p3;
                        transformationLine.update();
                        transformation.copy(p3).sub(p1).applyQuaternion(quat);

                        const angle = Math.atan2(transformation.y, transformation.x) - Math.atan2(reference.y, reference.x);

                        rotate.angle = angle;
                        rotate.update();
                        dialog.render();
                        gizmo.render(rotate);
                    }).resource(cmd);

                    transformationLine.cancel();
                    referenceLine.cancel();
                    gizmo.visible = true;
            }
        })
    }
}