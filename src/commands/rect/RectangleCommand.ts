import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import LineFactory from '../line/LineFactory';
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from './RectangleFactory';

export class ThreePointRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CornerRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'weak';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        rect.p1 = p1;

        await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterRectangleCommand extends Command {
    async execute(): Promise<void> {
        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        rect.p1 = p1;
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}
