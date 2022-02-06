import * as THREE from "three";
import Command from "../../command/Command";
import { GeometryFactory } from "../../command/GeometryFactory";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { point2point, vec2vec } from "../../util/Conversion";
import { GConstructor } from "../../util/Util";
import * as visual from "../../visual_model/VisualModel";
import { MirrorGizmo } from "../mirror/MirrorGizmo";
import { DraftSolidFactory } from "../modifyface/DraftSolidFactory";
import { ActionFaceCommand } from "../modifyface/ModifyFaceCommand";
import { MoveControlPointCommand, RotateControlPointCommand, ScaleControlPointCommand } from "../modify_contour/ModifyContourCommand";
import { FreestyleDraftSolidCommand, FreestyleItemScaleCommand, FreestyleMoveItemCommand, FreestyleRotateItemCommand } from "./FreestyleTranslateCommand";
import { MoveDialog } from "./MoveDialog";
import { MoveGizmo } from './MoveGizmo';
import { MoveKeyboardGizmo } from "./MoveKeyboardGizmo";
import { ProjectingBasicScaleFactory } from "./ProjectCurveFactory";
import { RotateDialog } from "./RotateDialog";
import { RotateGizmo } from './RotateGizmo';
import { RotateKeyboardGizmo } from "./RotateKeyboardGizmo";
import { ScaleDialog } from "./ScaleDialog";
import { ScaleGizmo } from "./ScaleGizmo";
import { ScaleKeyboardGizmo } from "./ScaleKeyboardGizmo";
import { MoveFactory, RotateFactory } from './TranslateFactory';

export const Y = new THREE.Vector3(0, 1, 0);
export const Z = new THREE.Vector3(0, 0, 1);

export class MoveCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;

        if (selected.faces.size > 0) {
            const command = new ActionFaceCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new MoveItemCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.controlPoints.size > 0) {
            const command = new MoveControlPointCommand(this.editor);
            this.editor.enqueue(command, true);
        }
    }
}

export class MoveItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = bbox.getCenter(new THREE.Vector3());

        const move = new MoveFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;

        const dialog = new MoveDialog(move, editor.signals);
        const gizmo = new MoveGizmo(move, editor);
        const keyboard = new MoveKeyboardGizmo(editor);

        dialog.execute(async (params) => {
            await move.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            move.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(onKeyPress(move, gizmo, FreestyleMoveItemCommand).bind(this)).resource(this);

        await this.finished;

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);
    }
}


export class ScaleCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new ScaleItemCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.controlPoints.size > 0) {
            const command = new ScaleControlPointCommand(this.editor);
            this.editor.enqueue(command, true);
        }
    }
}

export class ScaleItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects)
            bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const scale = new ProjectingBasicScaleFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.items = objects;
        scale.pivot = centroid;

        const gizmo = new ScaleGizmo(scale, editor);
        const dialog = new ScaleDialog(scale, editor.signals);
        const keyboard = new ScaleKeyboardGizmo(editor);

        dialog.execute(async (params) => {
            await scale.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            scale.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(onKeyPress(scale, gizmo, FreestyleItemScaleCommand).bind(this)).resource(this);

        await this.finished;

        const selection = await scale.commit();
        this.editor.selection.selected.add(selection);
    }
}

export class RotateCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.faces.size > 0) {
            const command = new DraftSolidCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.solids.size > 0 || selected.curves.size > 0) {
            const command = new RotateItemCommand(this.editor);
            this.editor.enqueue(command, true);
        } else if (selected.controlPoints.size > 0) {
            const command = new RotateControlPointCommand(this.editor);
            this.editor.enqueue(command, true);
        }
    }
}

export class RotateItemCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects)
            bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const rotate = new RotateFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.items = objects;
        rotate.pivot = centroid;

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);
        const keyboard = new RotateKeyboardGizmo(editor);

        dialog.execute(async (params) => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            rotate.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(onKeyPress(rotate, gizmo, FreestyleRotateItemCommand).bind(this)).resource(this);

        await this.finished;

        const selection = await rotate.commit();
        this.editor.selection.selected.add(selection);
    }
}

export class DraftSolidCommand extends Command {
    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid;

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const point = point2point(faceModel.Point(0.5, 0.5));
        const normal = vec2vec(faceModel.Normal(0.5, 0.5), 1);

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.pivot = point;
        draftSolid.normal = normal;

        const gizmo = new RotateGizmo(draftSolid, this.editor);
        const keyboard = new RotateKeyboardGizmo(this.editor);

        gizmo.position.copy(point);
        gizmo.execute(params => {
            draftSolid.update();
        }).resource(this);

        keyboard.execute(onKeyPress(draftSolid, gizmo, FreestyleDraftSolidCommand).bind(this)).resource(this);

        await this.finished;

        await draftSolid.commit();
    }
}

export function onKeyPress(factory: GeometryFactory & { pivot: THREE.Vector3 }, gizmo: RotateGizmo | MoveGizmo | ScaleGizmo, freestyle: GConstructor<Command>) {
    return async function (this: Command, s: string) {
        switch (s) {
            case 'pivot': {
                gizmo.disable();
                const pointPicker = new PointPicker(this.editor);
                const { point: pivot } = await pointPicker.execute(({ point: pivot, info: { snap } }) => {
                    const { orientation } = snap.project(pivot);
                    gizmo.position.copy(pivot);
                    gizmo.quaternion.copy(orientation);
                }).resource(this);
                gizmo.pivot.copy(pivot);
                factory.pivot = pivot;
                gizmo.enable();
                break;
            }
            case 'free':
                this.finish();
                this.editor.enqueue(new freestyle(this.editor), false);
        }
    }
}