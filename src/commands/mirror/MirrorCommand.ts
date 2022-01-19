import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { PhantomLineFactory } from '../line/LineFactory';
import { MirrorDialog } from "./MirrorDialog";
import { MirrorFactory, MirrorFactoryLike, MultiSymmetryFactory, SymmetryFactory } from "./MirrorFactory";
import { MirrorGizmo } from "./MirrorGizmo";
import { MirrorKeyboardGizmo } from "./MirrorKeyboardGizmo";


export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0) {
            const command = new MirrorSolidCommand(this.editor);
            this.editor.enqueue(command, true)
        } else if (selected.curves.size > 0) {
            const command = new MirrorItemCommand(this.editor);
            this.editor.enqueue(command, true)
        }
    }
}


abstract class AbstractMirrorCommand extends Command {
    async execute(): Promise<void> {
        const mirror = await this.makeFactory();
        mirror.origin = new THREE.Vector3();

        const gizmo = new MirrorGizmo(mirror, this.editor);
        const dialog = new MirrorDialog(mirror, this.editor.signals);
        const keyboard = new MirrorKeyboardGizmo(this.editor);
        const objectPicker = new ObjectPicker(this.editor);
        dialog.execute(async (params) => {
            await mirror.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(s => {
            mirror.update();
        }).resource(this);

        keyboard.execute(async (s) => {
            switch (s) {
                case 'free':
                    this.cancel();
                    this.editor.enqueue(new FreestyleMirrorCommand(this.editor), true);
            }
        }).resource(this);

        objectPicker.execute(async delta => {
            const selection = objectPicker.selection.selected;
            if (selection.faces.size === 0) return;
            mirror.plane = selection.faces.first;
            mirror.update();
        }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Face).resource(this);

        await this.finished;

        const result = await mirror.commit();
        this.editor.selection.selected.add(result);
    }

    protected abstract makeFactory(): Promise<MirrorFactoryLike>;
}

export class MirrorSolidCommand extends AbstractMirrorCommand {
    protected async makeFactory(): Promise<MirrorFactoryLike> {
        const { editor } = this;
        const mirror = new MultiSymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.solids = [...editor.selection.selected.solids];

        return mirror;
    }
}

export class MirrorItemCommand extends AbstractMirrorCommand {
    protected async makeFactory(): Promise<MirrorFactoryLike> {
        const { editor } = this;
        const mirror = new MirrorFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.item = editor.selection.selected.curves.first;

        return mirror;
    }
}

export class FreestyleMirrorCommand extends Command {
    async execute(): Promise<void> {
        const solid = this.editor.selection.selected.solids.first;
        const mirror = new SymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        mirror.solid = solid;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point: p1, info: { constructionPlane } } = await pointPicker.execute().resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1);

        mirror.origin = p1;

        const line = new PhantomLineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;

        await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();

            mirror.normal = p2.clone().sub(p1).cross(constructionPlane.n);
            mirror.update();
        }).resource(this);

        line.cancel();

        await mirror.commit();
    }
}
