import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker, PointResult } from "../../command/point-picker/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import LineFactory from '../line/LineFactory';
import { RectangleDialog } from "./RectangleDialog";
import { CenterRectangleFactory, CornerRectangleFactory, EditCenterRectangleFactory, EditCornerRectangleFactory, EditThreePointRectangleFactory, ThreePointRectangleFactory } from './RectangleFactory';
import { EditRectangleGizmo } from "./RectangleGizmo";
import { RectangleModeKeyboardGizmo } from "./RectangleModeKeyboardGizmo";

export class ThreePointRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        let pr1, pr2, pr3;
        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = pr1 = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = pr2 = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        rect.p1 = p1;
        rect.p2 = p2;
        pr3 = await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);

        const next = new EditThreePointRectangleCommand(this.editor);
        next.pr1 = pr1;
        next.pr2 = pr2;
        next.pr3 = pr3;
        next.rectangle = result;
        this.editor.enqueue(next, false);
    }
}

export class CornerRectangleCommand extends Command {
    pr1?: PointResult;
    pr2?: PointResult;

    async execute(): Promise<void> {
        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        let { pr1, pr2 } = this;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = pr1 = await pointPicker.execute({ result: pr1 }).resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1, snap);
        rect.p1 = p1;

        const keyboard = new RectangleModeKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    const command = new CenterRectangleCommand(this.editor);
                    command.pr1 = pr1;
                    command.pr2 = pr2;
                    this.editor.enqueue(command, true);
            }
        }).resource(this);

        pr2 = await pointPicker.execute(result => {
            const { point: p2, info: { orientation } } = pr2 = result;
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }, { result: pr2 }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);

        const next = new EditCornerRectangleCommand(this.editor);
        next.pr1 = pr1;
        next.pr2 = pr2;
        next.rectangle = result;
        this.editor.enqueue(next, false);
    }
}

export class CenterRectangleCommand extends Command {
    pr1?: PointResult;
    pr2?: PointResult;

    async execute(): Promise<void> {
        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        let { pr1, pr2 } = this;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = pr1 = await pointPicker.execute({ result: pr1 }).resource(this);
        rect.p1 = p1;
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const keyboard = new RectangleModeKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    const command = new CornerRectangleCommand(this.editor);
                    command.pr1 = pr1;
                    command.pr2 = pr2;
                    this.editor.enqueue(command, true);
            }
        }).resource(this);

        pr2 = await pointPicker.execute(result => {
            const { point: p2, info: { orientation } } = pr2 = result;
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }, { result: pr2 }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);

        const next = new EditCenterRectangleCommand(this.editor);
        next.pr1 = pr1;
        next.pr2 = pr2;
        next.rectangle = result;
        this.editor.enqueue(next, false);
    }
}

export class EditCenterRectangleCommand extends Command {
    readonly remember = false;
    pr1!: PointResult;
    pr2!: PointResult;
    rectangle!: visual.SpaceInstance<visual.Curve3D>;

    async execute(): Promise<void> {
        const { pr1, pr2, rectangle } = this;
        const edit = new EditCenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        edit.p1 = pr1.point;
        edit.p2 = pr2.point;
        edit.orientation = pr2.info.orientation;
        edit.rectangle = rectangle;
        edit.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const dialog = new RectangleDialog(edit, this.editor.signals);
        const gizmo = new EditRectangleGizmo(edit, this.editor);

        dialog.execute(params => {
            edit.update();
            dialog.render();
            gizmo.render(edit);
        }).rejectOnInterrupt().resource(this);

        gizmo.position.copy(pr1.point);
        gizmo.basis = edit.basis;
        gizmo.execute(async params => {
            dialog.render();
            await edit.update();
        }).resource(this);

        await this.finished;

        const result = await edit.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class EditCornerRectangleCommand extends Command {
    readonly remember = false;
    pr1!: PointResult;
    pr2!: PointResult;
    rectangle!: visual.SpaceInstance<visual.Curve3D>;

    async execute(): Promise<void> {
        const { pr1, pr2, rectangle } = this;
        const edit = new EditCornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        edit.p1 = pr1.point;
        edit.p2 = pr2.point;
        edit.orientation = pr2.info.orientation;
        edit.rectangle = rectangle;

        const dialog = new RectangleDialog(edit, this.editor.signals);
        const gizmo = new EditRectangleGizmo(edit, this.editor);

        dialog.execute(params => {
            edit.update();
            dialog.render();
            gizmo.render(edit);
        }).rejectOnInterrupt().resource(this);

        gizmo.position.copy(pr1.point);
        gizmo.basis = edit.basis;
        gizmo.execute(async params => {
            dialog.render();
            await edit.update();
        }).resource(this);

        await this.finished;

        const result = await edit.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class EditThreePointRectangleCommand extends Command {
    readonly remember = false;
    pr1!: PointResult;
    pr2!: PointResult;
    pr3!: PointResult;
    rectangle!: visual.SpaceInstance<visual.Curve3D>;

    async execute(): Promise<void> {
        const { pr1, pr2, pr3, rectangle } = this;
        const edit = new EditThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        edit.p1 = pr1.point;
        edit.p2 = pr2.point;
        edit.p3 = pr3.point;
        edit.rectangle = rectangle;

        const dialog = new RectangleDialog(edit, this.editor.signals);
        const gizmo = new EditRectangleGizmo(edit, this.editor);

        dialog.execute(params => {
            edit.update();
            dialog.render();
            gizmo.render(edit);
        }).rejectOnInterrupt().resource(this);

        gizmo.position.copy(pr1.point);
        gizmo.basis = edit.basis;
        gizmo.execute(async params => {
            dialog.render();
            await edit.update();
        }).resource(this);

        await this.finished;

        const result = await edit.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}