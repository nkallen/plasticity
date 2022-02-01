import c3d from '../../../build/Release/c3d.node';
import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { PointSnap } from "../../editor/snaps/Snap";
import { Finish } from "../../util/Cancellable";
import * as visual from "../../visual_model/VisualModel";
import { CurvePointSnap, CurveSnap } from "../../editor/snaps/Snap";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { BridgeCurvesDialog } from "./BridgeCurvesDialog";
import BridgeCurvesFactory from "./BridgeCurvesFactory";
import CurveFactory from "./CurveFactory";
import OffsetCurveFactory from "./OffsetContourFactory";
import { OffsetCurveGizmo } from "./OffsetCurveGizmo";
import TrimFactory from "./TrimFactory";
import { CurveWithPreviewFactory } from "./CurveFactory";
import { CurveKeyboardEvent, CurveKeyboardGizmo, LineKeyboardGizmo } from "./CurveKeyboardGizmo";
import JoinCurvesFactory from './JoinCurvesFactory';
import * as THREE from 'three';
import { ObjectPicker } from '../../command/ObjectPicker';
import { ValidationError } from '../../command/GeometryFactory';
import MultilineFactory from '../multiline/MultilineFactory';
import { MultilineDialog } from '../multiline/MultilineDialog';
import { TrimDialog } from './TrimDialog';

const Y = new THREE.Vector3(0, 1, 0);


export class CurveCommand extends Command {
    protected type = c3d.SpaceType.Hermit3D;
    protected get keyboard() { return new CurveKeyboardGizmo(this.editor); };

    async execute(): Promise<void> {
        this.editor.layers.showControlPoints();
        this.ensure(() => this.editor.layers.hideControlPoints());

        const makeCurve = new CurveWithPreviewFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        makeCurve.type = this.type;

        const pointPicker = new PointPicker(this.editor);
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
                    break;
            }
        }).resource(this);

        while (true) {
            if (makeCurve.canBeClosed) {
                pointPicker.clearAddedSnaps();
                pointPicker.addSnap(new PointSnap("Closed", makeCurve.startPoint));
            }
            try {
                const { point, info: { snap } } = await pointPicker.execute(async ({ point, info: { snap } }) => {
                    makeCurve.preview.last = point;
                    makeCurve.preview.snap = snap;
                    if (makeCurve.preview.hasEnoughPoints)
                        await makeCurve.preview.update();
                }, true).resource(this);
                if (makeCurve.wouldBeClosed(point)) {
                    makeCurve.closed = true;
                    throw Finish;
                }
                makeCurve.push(point);
                makeCurve.snap = snap;
                makeCurve.update();
            } catch (e) {
                if (e !== Finish) throw e;
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


export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selected.curves) contour.push(curve);
        const results = await contour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        this.editor.selection.selected.addCurve(results[0]);
    }
}


export class TrimCommand extends Command {
    async execute(): Promise<void> {
        const dialog = new TrimDialog({}, this.editor.signals);

        dialog.execute(async (params) => {
        }).resource(this).then(() => this.finish(), () => this.cancel());

        this.editor.layers.showFragments();
        this.ensure(() => this.editor.layers.hideFragments());

        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.mode.set(SelectionMode.Curve);
        objectPicker.raycasterParams.Line2.threshold = 30;

        const selected = await dialog.prompt("Select curve segments", () => {
            return objectPicker.execute(delta => {
            }).resource(this);
        })();

        for (const curve of selected.curves) {
            const factory = new TrimFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
            factory.fragment = curve;
            await factory.commit();
        }

        this.editor.enqueue(new TrimCommand(this.editor), false);
    }
}

export class BridgeCurvesCommand extends Command {
    async execute(): Promise<void> {
        const factory = new BridgeCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selected = this.editor.selection.selected;

        const dialog = new BridgeCurvesDialog(factory, this.editor.signals);
        dialog.execute(params => {
            factory.update();
            dialog.render();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pointPicker = new PointPicker(this.editor);
        pointPicker.raycasterParams.Line2.threshold = 50;
        const line = new CurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.style = 1;
        const { point: p1, info: { snap: snap1 } } = await pointPicker.execute().resource(this);
        if (!(snap1 instanceof CurveSnap || snap1 instanceof CurvePointSnap))
            throw new ValidationError();

        line.push(p1);
        factory.curve1 = snap1.view;
        factory.t1 = snap1.t(p1);

        line.push(p1);
        const { info: { snap: snap2 } } = await pointPicker.execute(({ point: p2, info: { snap: snap2 } }) => {
            line.last = p2;
            if (line.hasEnoughPoints)
                line.update();

            if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap))
                return;
            factory.curve2 = snap2.view;
            factory.t2 = snap2.t(p2);
            factory.update();
            dialog.render();
        }).resource(this);
        if (!(snap2 instanceof CurveSnap || snap2 instanceof CurvePointSnap))
            throw new ValidationError();
        line.cancel();

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class OffsetCurveCommand extends Command {
    async execute(): Promise<void> {
        const face = this.editor.selection.selected.faces.first;
        const curve = this.editor.selection.selected.curves.first;
        const edges = this.editor.selection.selected.edges;

        const offsetContour = new OffsetCurveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        offsetContour.constructionPlane = this.editor.activeViewport?.constructionPlane;
        if (face !== undefined)
            offsetContour.face = face;
        if (curve !== undefined)
            offsetContour.curve = curve;
        if (edges.size > 0)
            offsetContour.edges = [...edges];

        const gizmo = new OffsetCurveGizmo(offsetContour, this.editor);
        gizmo.position.copy(offsetContour.center);
        gizmo.quaternion.setFromUnitVectors(Y, offsetContour.normal);
        gizmo.relativeScale.setScalar(0.8);

        gizmo.execute(d => {
            offsetContour.update();
        }).resource(this);
        gizmo.start('gizmo:offset-curve:distance');

        await this.finished;

        if (face !== undefined)
            this.editor.selection.selected.removeFace(face);
        if (curve !== undefined)
            this.editor.selection.selected.removeCurve(curve);

        const offset = await offsetContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(offset);
    }
}

export class MultilineCommand extends Command {
    async execute(): Promise<void> {
        const curve = this.editor.selection.selected.curves.first;
        const factory = new MultilineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.curve = curve;

        const dialog = new MultilineDialog(factory, this.editor.signals);

        await factory.update();

        dialog.execute(params => {
            factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;

        await factory.commit();
    }
}
