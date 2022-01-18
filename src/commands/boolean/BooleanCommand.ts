import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { CancellablePromise } from "../../util/CancellablePromise";
import * as visual from "../../visual_model/VisualModel";
import { MoveGizmo } from '../translate/MoveGizmo';
import { BooleanDialog, CutDialog } from "./BooleanDialog";
import { MovingBooleanFactory } from './BooleanFactory';
import { BooleanKeyboardGizmo } from "./BooleanKeyboardGizmo";
import { MultiCutFactory } from "./CutFactory";
import { CutGizmo } from "./CutGizmo";

export class BooleanCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const factory = new MovingBooleanFactory(editor.db, editor.materials, editor.signals);
        factory.resource(this);

        const dialog = new BooleanDialog(factory, editor.signals);
        const keyboard = new BooleanKeyboardGizmo(this.editor);

        dialog.execute(async (params) => {
            factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        keyboard.execute(e => {
            let operationType;
            switch (e) {
                case 'union': operationType = c3d.OperationType.Union; break;
                case 'difference': operationType = c3d.OperationType.Difference; break;
                case 'intersect': operationType = c3d.OperationType.Intersect; break;
                default: throw new Error('invalid case');
            }
            factory.operationType = operationType;
            factory.update();
        }).resource(this);

        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);
        const getTarget = dialog.prompt("Select target bodies",
            () => objectPicker.shift(SelectionMode.Solid, 1).resource(this));
        const solids = await getTarget();
        factory.target = [...solids][0];
        await factory.update();

        dialog.replace("Select target bodies",
            () => {
                const objectPicker = new ObjectPicker(this.editor);
                return objectPicker.execute(selection => {
                    const targets = [...selection.solids];
                    factory.target = targets[0];
                    factory.update();
                }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
            });

        let g: CancellablePromise<void> | undefined = undefined;
        const getTools = dialog.prompt("Select tool bodies", () => {
            const objectPicker = new ObjectPicker(this.editor);
            return objectPicker.execute(async selection => {
                const tools = [...selection.solids];

                const bbox = new THREE.Box3();
                for (const object of tools) bbox.expandByObject(object);
                bbox.getCenter(centroid);

                g?.cancel();
                const gizmo = new MoveGizmo(factory, editor);
                gizmo.position.copy(centroid);
                g = gizmo.execute(s => {
                    factory.update();
                }).resource(this);
                factory.move.set(0, 0, 0);

                factory.tools = tools;
                await factory.update();
            }, 0, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
        });
        getTools();

        await this.finished;

        const result = await factory.commit() as visual.Solid;
        editor.selection.selected.addSolid(result);
    }
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

        let objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);
        cut.solids = await objectPicker.slice(SelectionMode.Solid, 1, Number.MAX_SAFE_INTEGER).resource(this);
        // cut.faces = [...this.editor.selection.selected.faces];
        cut.curves = [...this.editor.selection.selected.curves];
        await cut.update();

        objectPicker = new ObjectPicker(this.editor);
        objectPicker.mode.set(SelectionMode.Face, SelectionMode.Curve);
        objectPicker.execute(async (selection) => {
            cut.surfaces = [...selection.faces];
            cut.curves = [...selection.curves];
            cut.update();
        }, 1, Number.MAX_SAFE_INTEGER).resource(this);

        await this.finished;

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}

const centroid = new THREE.Vector3();