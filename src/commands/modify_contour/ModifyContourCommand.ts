import * as THREE from "three";
import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { AbstractFreestyleMoveCommand, AbstractFreestyleRotateCommand, AbstractFreestyleScaleCommand } from "../translate/FreestyleTranslateCommand";
import { MoveDialog } from "../translate/MoveDialog";
import { MoveGizmo } from '../translate/MoveGizmo';
import { MoveKeyboardGizmo } from "../translate/MoveKeyboardGizmo";
import { RotateDialog } from "../translate/RotateDialog";
import { RotateGizmo } from '../translate/RotateGizmo';
import { RotateKeyboardGizmo } from "../translate/RotateKeyboardGizmo";
import { ScaleDialog } from "../translate/ScaleDialog";
import { ScaleGizmo } from "../translate/ScaleGizmo";
import { ScaleKeyboardGizmo } from "../translate/ScaleKeyboardGizmo";
import { choosePivot, onKeyPress } from "../translate/TranslateCommand";
import { MoveFactoryLike, RotateFactoryLike } from '../translate/TranslateItemFactory';
import { ModifyContourFactory } from "./ModifyContourFactory";
import { ModifyContourGizmo } from "./ModifyContourGizmo";
import { FreestyleScaleContourPointFactory, MoveContourPointFactory, RotateContourPointFactory, ScaleContourPointFactory } from "./ModifyContourPointFactory";

export class ModifyContourCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        let curve = selected.curves.last!;

        const factory = new ModifyContourFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.originalItem = curve;
        factory.contour = await factory.prepare(curve);

        const gizmo = new ModifyContourGizmo(factory, this.editor);
        gizmo.execute(params => {
            factory.update();
        }).resource(this);

        await this.finished;

        const result = await factory.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class MoveControlPointCommand extends Command {
    choosePivot = false;

    async execute(): Promise<void> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const move = new MoveContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.controlPoints = points;
        move.originalItem = curve;
        move.contour = await move.prepare(curve);

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const dialog = new MoveDialog(move, editor.signals);
        const gizmo = new MoveGizmo(move, editor);
        const keyboard = new MoveKeyboardGizmo(editor);

        choosePivot.call(this, this.choosePivot, centroid, move, gizmo);

        dialog.execute(async (params) => {
            await move.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(params => {
            move.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(onKeyPress(MoveControlPointCommand, gizmo, FreestyleMoveControlPointCommand).bind(this)).resource(this);

        await this.finished;

        const result = await move.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleMoveControlPointCommand extends AbstractFreestyleMoveCommand {
    protected async makeFactory(): Promise<MoveFactoryLike> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const move = new MoveContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.controlPoints = points;
        move.originalItem = curve;
        move.contour = await move.prepare(curve);

        return move;
    }
}


export class RotateControlPointCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points)
            centroid.add(point.position);
        centroid.divideScalar(points.length);

        const rotate = new RotateContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.controlPoints = points;
        rotate.originalItem = curve;
        rotate.contour = await rotate.prepare(curve);
        rotate.pivot = centroid;

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);
        const keyboard = new RotateKeyboardGizmo(editor);

        dialog.execute(async (params) => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            rotate.update();
        }).resource(this);

        keyboard.execute(async (s) => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleRotateControlPointCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const result = await rotate.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleRotateControlPointCommand extends AbstractFreestyleRotateCommand {
    protected async makeFactory(): Promise<RotateFactoryLike> {
        const { editor } = this;
        const selected = editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const rotate = new RotateContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.controlPoints = points;
        rotate.originalItem = curve;
        rotate.contour = await rotate.prepare(curve);

        return rotate;
    }
}

export class ScaleControlPointCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points) centroid.add(point.position);
        centroid.divideScalar(points.length);

        const scale = new ScaleContourPointFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        scale.controlPoints = points;
        scale.originalItem = curve;
        scale.contour = await scale.prepare(curve);
        scale.pivot = centroid;

        const gizmo = new ScaleGizmo(scale, this.editor);
        const dialog = new ScaleDialog(scale, this.editor.signals);
        const keyboard = new ScaleKeyboardGizmo(this.editor);

        dialog.execute(async (params) => {
            await scale.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(params => {
            scale.update();
        }).resource(this);

        keyboard.execute(async (s) => {
            switch (s) {
                case 'free':
                    this.finish();
                    this.editor.enqueue(new FreestyleScaleControlPointCommand(this.editor), false);
            }
        }).resource(this);

        await this.finished;

        const result = await scale.commit() as visual.SpaceInstance<visual.Curve3D>;
        selected.addCurve(result);
    }
}

export class FreestyleScaleControlPointCommand extends AbstractFreestyleScaleCommand {
    protected async makeFactory() {
        const { editor, editor: { selection: { selected } } } = this;
        const points = [...selected.controlPoints];
        const curve = points[0].parentItem;

        const centroid = new THREE.Vector3();
        for (const point of points)
            centroid.add(point.position);
        centroid.divideScalar(points.length);

        const scale = new FreestyleScaleContourPointFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.controlPoints = points;
        scale.originalItem = curve;
        scale.contour = await scale.prepare(curve);
        return scale;
    }
}
