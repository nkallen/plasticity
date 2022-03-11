import * as THREE from "three";
import Command from "../../command/Command";
import { AxisHelper } from "../../command/MiniGizmos";
import { PointPicker } from "../../command/point-picker/PointPicker";
import { AxisSnap, PlaneSnap, PointSnap } from "../../editor/snaps/Snap";
import { vec2vec } from "../../util/Conversion";
import * as visual from "../../visual_model/VisualModel";
import { PhantomLineFactory } from '../line/LineFactory';
import { DraftSolidFactory } from "../modifyface/DraftSolidFactory";
import { MoveDialog } from "./MoveDialog";
import { ProjectingFreestyleScaleFactory } from "./ProjectCurveFactory";
import { RotateDialog } from "./RotateDialog";
import { RotateGizmo } from './RotateGizmo';
import { ScaleDialog } from "./ScaleDialog";
import { MoveItemCommand, RotateCommand, ScaleCommand, Y, Z } from "./TranslateCommand";
import { FreestyleScaleFactoryLike, MoveFactory, MoveFactoryLike, RotateFactory, RotateFactoryLike } from './TranslateFactory';

export abstract class AbstractFreestyleMoveCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;

        const move = await this.makeFactory();
        await move.showPhantoms();

        const dialog = new MoveDialog(move, editor.signals);

        dialog.execute(async (params) => {
            await move.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        bbox.makeEmpty();
        for (const item of move.items) bbox.expandByObject(item);
        bbox.getCenter(defaultPosition);

        const line = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute({ default: { position: defaultPosition, orientation: defaultOrientation } }).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            move.move = p2.clone().sub(p1);
            move.update();
            line.update();
            dialog.render();
        }, { default: { position: origin, orientation: defaultOrientation } }).resource(this);
        move.move = p2.clone().sub(p1);
        line.cancel();
        dialog.finish();

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new MoveItemCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<MoveFactoryLike>;
}

export abstract class AbstractFreestyleScaleCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;

        const scale = await this.makeFactory();
        await scale.showPhantoms();

        const dialog = new ScaleDialog(scale, editor.signals);
        dialog.execute(async (params) => {
            await scale.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const referenceLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        referenceLine.p1 = p1;
        scale.pivot = p1;

        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            referenceLine.p2 = p2;
            referenceLine.update();
        }).resource(this);
        scale.from(p1, p2);
        pointPicker.addSnap(new PointSnap("zero", p1));

        pointPicker.restrictToLine(p1, scale.ref);
        await pointPicker.execute(({ point: p3 }) => {
            scale.to(p1, p3);
            scale.update();
            dialog.render();
        }).resource(this);

        referenceLine.cancel();
        dialog.finish();

        const selection = await scale.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new ScaleCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<FreestyleScaleFactoryLike>;
}

export abstract class AbstractFreestyleRotateCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;

        const rotate = await this.makeFactory();
        await rotate.showPhantoms();

        const gizmo = new RotateGizmo(rotate, editor);
        const dialog = new RotateDialog(rotate, editor.signals);

        dialog.execute(async (params) => {
            await rotate.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const axisLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        let pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        axisLine.p1 = p1;
        rotate.pivot = p1;
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            axisLine.p2 = p2;
            axisLine.update();
        }).resource(this);
        rotate.axis = p2.clone().sub(p1).normalize();

        const axisHelper = new AxisHelper(this.editor.gizmos.default.line, true).resource(this);
        axisHelper.position.copy(p1);
        axisHelper.quaternion.setFromUnitVectors(Y, rotate.axis);
        this.editor.helpers.add(axisHelper);

        const referenceLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        referenceLine.p1 = p1;
        const { point: p3 } = await pointPicker.execute(({ point: p3 }) => {
            referenceLine.p2 = p3;
            referenceLine.update();
        }).resource(this);
        referenceLine.cancel();
        const reference = p3.clone().sub(p1).normalize();

        const angleLine = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        angleLine.p1 = p1;

        pointPicker = new PointPicker(this.editor);
        pointPicker.restrictToPlane(new PlaneSnap(rotate.axis, p1));
        pointPicker.addSnap(new AxisSnap("180", reference, p1));
        pointPicker.addSnap(new AxisSnap("90", reference.clone().cross(rotate.axis).normalize(), p1));

        const transformation = new THREE.Vector3();
        const quat = new THREE.Quaternion().setFromUnitVectors(rotate.axis, Z);
        const referenceOnZ = reference.applyQuaternion(quat).normalize();
        await pointPicker.execute(({ point: p3 }) => {
            angleLine.p2 = p3;
            angleLine.update();
            transformation.copy(p3).sub(p1).applyQuaternion(quat);

            const angle = Math.atan2(transformation.y, transformation.x) - Math.atan2(referenceOnZ.y, referenceOnZ.x);
            rotate.angle = angle;
            rotate.update();
            dialog.render();
            gizmo.render(rotate);
        }).resource(this);

        angleLine.cancel();
        axisLine.cancel();
        dialog.finish();

        const selection = await rotate.commit();
        this.editor.selection.selected.add(selection);

        this.editor.enqueue(new RotateCommand(this.editor), false);
    }

    protected abstract makeFactory(): Promise<RotateFactoryLike>;
}

export class FreestyleMoveItemCommand extends AbstractFreestyleMoveCommand {
    protected async makeFactory(): Promise<MoveFactory> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects)
            bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const move = new MoveFactory(editor.db, editor.materials, editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;
        return move;
    }
}

export class FreestyleItemScaleCommand extends AbstractFreestyleScaleCommand {
    protected async makeFactory() {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const bbox = new THREE.Box3();
        for (const object of objects)
            bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const scale = new ProjectingFreestyleScaleFactory(editor.db, editor.materials, editor.signals).resource(this);
        scale.items = objects;

        return scale;
    }
}

export class FreestyleRotateItemCommand extends AbstractFreestyleRotateCommand {
    protected async makeFactory(): Promise<RotateFactory> {
        const { editor } = this;
        const objects = [...editor.selection.selected.solids, ...editor.selection.selected.curves];

        const rotate = new RotateFactory(editor.db, editor.materials, editor.signals).resource(this);
        rotate.items = objects;
        return rotate;
    }
}

export class FreestyleDraftSolidCommand extends AbstractFreestyleRotateCommand {
    protected async makeFactory(): Promise<DraftSolidFactory> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid;

        const face = faces[0];
        const faceModel = this.editor.db.lookupTopologyItem(face);
        const normal = vec2vec(faceModel.Normal(0.5, 0.5), 1);

        const draftSolid = new DraftSolidFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        draftSolid.solid = parent;
        draftSolid.faces = faces;
        draftSolid.normal = normal;
        return draftSolid;
    }
}

const defaultPosition = new THREE.Vector3();
const origin = new THREE.Vector3();
const bbox = new THREE.Box3();
const defaultOrientation = new THREE.Quaternion();