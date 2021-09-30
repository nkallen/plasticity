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
                    const { point: p1 } = await pointPicker.execute().resource(cmd);
                    referenceLine.p1 = p1;
                    scale.pivot = p1;
                    pointPicker.restrictToPlaneThroughPoint(p1);

                    const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
                        referenceLine.p2 = p2;
                        referenceLine.update();
                    }).resource(cmd);
                    scale.from(p1, p2);

                    const transformationLine = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    transformationLine.p1 = p1;

                    pointPicker.restrictToLine(p1, scale.ref);
                    await pointPicker.execute(({ point: p3 }) => {
                        transformationLine.p2 = p3;
                        transformationLine.update();

                        scale.to(p1, p3);
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