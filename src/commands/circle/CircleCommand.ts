import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import { CenterPointArcFactory } from "../arc/ArcFactory";
import LineFactory from '../line/LineFactory';
import { CircleDialog } from "./CircleDialog";
import { CenterCircleFactory, ThreePointCircleFactory, TwoPointCircleFactory } from './CircleFactory';
import { CircleKeyboardGizmo } from "./CircleKeyboardGizmo";

export class CenterCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = point;

        const dialog = new CircleDialog(circle, this.editor.signals);
        dialog.execute(params => {
            circle.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
            }
        }).resource(this);

        pointPicker.restrictToPlaneThroughPoint(point, snap);
        await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            circle.point = p2;
            circle.orientation = orientation;
            dialog.render();
            circle.update();
        }).resource(this);

        await this.finished;

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class TwoPointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new TwoPointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new CircleKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    circle.toggleMode();
                    circle.update();
                    break;
            }
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        circle.p1 = point;

        pointPicker.restrictToPlaneThroughPoint(point, snap);
        await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            circle.p2 = p2;
            circle.orientation = orientation;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class ThreePointCircleCommand extends Command {
    async execute(): Promise<void> {
        const circle = new ThreePointCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        circle.p1 = p1;

        const { point: p2 } = await pointPicker.execute().resource(this);
        circle.p2 = p2;

        await pointPicker.execute(({ point: p3 }) => {
            circle.p3 = p3;
            circle.update();
        }).resource(this);

        const result = await circle.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterPointArcCommand extends Command {
    async execute(): Promise<void> {
        const arc = new CenterPointArcFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        arc.center = p1;

        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        arc.p2 = p2;

        await pointPicker.execute(({ point: p3, info: { orientation } }) => {
            arc.p3 = p3;
            arc.orientation = orientation;
            arc.update();
        }).resource(this);

        const result = await arc.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}
