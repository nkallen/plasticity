import * as THREE from "three";
import Command, { EditorLike } from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { HasSelectedAndHovered, HasSelection, ModifiesSelection } from "../../selection/SelectionDatabase";
import { CancellablePromise } from "../../util/CancellablePromise";
import { PhantomLineFactory } from '../line/LineFactory';
import { MirrorDialog } from "./MirrorDialog";
import { MirrorFactory, MultiSymmetryFactory } from "./MirrorFactory";
import { MirrorGizmo } from "./MirrorGizmo";
import { MirrorKeyboardGizmo } from "./MirrorKeyboardGizmo";

export class MirrorCommand extends Command {
    async execute(): Promise<void> {
        const mirror = MakeMirrorFactory(this.editor, this.editor.selection.selected).resource(this);

        const gizmo = new MirrorGizmo(mirror, this.editor);
        const dialog = new MirrorDialog(mirror, this.editor.signals);
        const keyboard = new MirrorKeyboardGizmo(this.editor);

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

        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.execute(async delta => {
            const selection = objectPicker.selection.selected;
            if (selection.faces.size === 0) return;
            mirror.move = 0;
            mirror.plane = selection.faces.first;
            gizmo.render(mirror);
            mirror.update();
        }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Face).resource(this);

        await this.finished;

        const result = await mirror.commit();
        this.editor.selection.selected.add(result);
    }
}

export class FreestyleMirrorCommand extends Command {
    async execute(): Promise<void> {
        const mirror = MakeMirrorFactory(this.editor, this.editor.selection.selected);
        mirror.origin = new THREE.Vector3();

        const dialog = new MirrorDialog(mirror, this.editor.signals);
        dialog.execute(async (params) => {
            await mirror.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

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

            mirror.normal = p2.clone().sub(p1).cross(constructionPlane.n).normalize();
            mirror.update();
        }).resource(this);

        line.cancel();

        await mirror.commit();
    }
}

function MakeMirrorFactory(editor: EditorLike, selected: ModifiesSelection) {
    let mirror: MultiSymmetryFactory | MirrorFactory;
    if (selected.solids.size > 0) {
        mirror = new MultiSymmetryFactory(editor.db, editor.materials, editor.signals);
        mirror.solids = [...selected.solids];
        return mirror;
    } else if (selected.curves.size > 0) {
        mirror = new MirrorFactory(editor.db, editor.materials, editor.signals);
        mirror.item = selected.curves.first;
        return mirror;
    } else {
        throw new Error("Invalid selection");
    }
}