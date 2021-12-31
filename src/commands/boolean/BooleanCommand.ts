import * as THREE from "three";
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import * as visual from "../../visual_model/VisualModel";
import { BooleanDialog, CutDialog } from "./BooleanDialog";
import { MovingBooleanFactory, MovingDifferenceFactory, MovingIntersectionFactory, MovingUnionFactory } from './BooleanFactory';
import { MultiCutFactory } from "./CutFactory";
import { CutGizmo } from "./CutGizmo";
import { MoveGizmo } from '../translate/MoveGizmo';



abstract class BooleanCommand extends Command {
    protected abstract factory: MovingBooleanFactory;

    async execute(): Promise<void> {
        const { factory, editor } = this;
        factory.resource(this);

        const items = [...editor.selection.selected.solids];
        const tools = items.slice(1);

        const bbox = new THREE.Box3();
        for (const object of tools)
            bbox.expandByObject(object);
        const centroid = bbox.getCenter(new THREE.Vector3());

        factory.solid = items[0];
        factory.tools = tools;
        await factory.update();

        const dialog = new BooleanDialog(factory, editor.signals);
        const gizmo = new MoveGizmo(factory, editor);

        dialog.execute(async (params) => {
            await factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(centroid);
        gizmo.execute(s => {
            factory.update();
        }).resource(this);

        await this.finished;

        const result = await factory.commit() as visual.Solid;
        editor.selection.selected.addSolid(result);
    }
}

export class UnionCommand extends BooleanCommand {
    protected factory = new MovingUnionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class IntersectionCommand extends BooleanCommand {
    protected factory = new MovingIntersectionFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class DifferenceCommand extends BooleanCommand {
    protected factory = new MovingDifferenceFactory(this.editor.db, this.editor.materials, this.editor.signals);
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const cut = new MultiCutFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const gizmo = new CutGizmo(cut, this.editor);
        const dialog = new CutDialog(cut, this.editor.signals);

        dialog.execute(async (params) => {
            await cut.update();
        }).resource(this);

        gizmo.execute(async (params) => {
            await cut.update();
        }).resource(this);

        const objectPicker = new ObjectPicker(this.editor);
        cut.solids = await objectPicker.get(SelectionMode.Solid, 1);
        // cut.faces = [...this.editor.selection.selected.faces];
        cut.curves = [...this.editor.selection.selected.curves];
        await cut.update();

        objectPicker.max = Number.POSITIVE_INFINITY;
        objectPicker.mode.set(SelectionMode.Face);
        objectPicker.execute(async (selection) => {
            cut.surfaces = [...selection.faces];
            cut.update();
        }).resource(this);

        await this.finished;

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}
