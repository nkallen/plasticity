import * as THREE from 'three';
import * as c3d from '../../kernel/kernel';
import Command from "../../command/Command";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { PointSnap } from "../../editor/snaps/PointSnap";
import { Finish } from "../../util/Cancellable";
import * as visual from "../../visual_model/VisualModel";
import { CurveWithPreviewFactory } from "./CurveFactory";
import { CurveKeyboardEvent, CurveKeyboardGizmo, LineKeyboardGizmo } from "./CurveKeyboardGizmo";

const Y = new THREE.Vector3(0, 1, 0);

export class CurveCommand extends Command {
    protected type = c3d.SpaceType.Hermit3D;
    protected get keyboard() { return new CurveKeyboardGizmo(this.editor); };

    async execute(): Promise<void> {
        this.editor.layers.showControlPoints();
        this.ensure(() => this.editor.layers.hideControlPoints());

        const makeCurve = new CurveWithPreviewFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        makeCurve.type = this.type;
        makeCurve.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'weak';
        const keyboard = this.keyboard;
        keyboard.execute((e: CurveKeyboardEvent) => {
            switch (e.tag) {
                case 'type':
                    makeCurve.type = e.type;
                    makeCurve.update();
                    break;
                case 'undo':
                    pointPicker.undo();
                    makeCurve.undo();
                    makeCurve.update();
                    addSnaps(makeCurve, pointPicker);
                    break;
            }
        }).resource(this);

        while (true) {
            addSnaps(makeCurve, pointPicker);
            try {
                const { point, info: { snap } } = await pointPicker.execute(async ({ point, info: { snap } }) => {
                    makeCurve.preview.last = point;
                    makeCurve.preview.snap = snap;
                    if (makeCurve.preview.hasEnoughPoints)
                        await makeCurve.preview.update();
                }, { rejectOnFinish: true }).resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    throw new Finish();
                }
                makeCurve.push(point);
                makeCurve.snap = snap;
                makeCurve.update();
            } catch (e) {
                if (!(e instanceof Finish)) throw e;
                break;
            }
        }

        makeCurve.preview.cancel();
        const result = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class LineCommand extends CurveCommand {
    protected type = c3d.SpaceType.Polyline3D;
    protected get keyboard() { return new LineKeyboardGizmo(this.editor); };
}

function addSnaps(makeCurve: CurveWithPreviewFactory, pointPicker: PointPicker) {
    pointPicker.clearAddedSnaps();
    if (makeCurve.canBeClosed) {
        for (const point of makeCurve.otherPoints) {
            pointPicker.addSnap(new PointSnap(undefined, point));
        }
        pointPicker.addSnap(new PointSnap("Closed", makeCurve.startPoint));
    }
}
