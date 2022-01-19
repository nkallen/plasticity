import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { HasSelection } from "../../selection/SelectionDatabase";
import { CancellablePromise } from "../../util/CancellablePromise";
import * as visual from "../../visual_model/VisualModel";
import { MoveGizmo } from '../translate/MoveGizmo';
import { BooleanDialog, CutDialog } from "./BooleanDialog";
import { MultiBooleanFactory } from './BooleanFactory';
import { BooleanKeyboardGizmo } from "./BooleanKeyboardGizmo";
import { MultiCutFactory } from "./CutFactory";
import { CutGizmo } from "./CutGizmo";

export class BooleanCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const boolean = new MultiBooleanFactory(editor.db, editor.materials, editor.signals);
        boolean.resource(this);

        const dialog = new BooleanDialog(boolean, editor.signals);
        const keyboard = new BooleanKeyboardGizmo(this.editor);
        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);

        dialog.execute(async (params) => {
            boolean.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        keyboard.execute(e => {
            let operationType;
            switch (e) {
                case 'union': operationType = c3d.OperationType.Union; break;
                case 'difference': operationType = c3d.OperationType.Difference; break;
                case 'intersect': operationType = c3d.OperationType.Intersect; break;
                default: throw new Error('invalid case');
            }
            boolean.operationType = operationType;
            boolean.update();
        }).resource(this);

        GetFirstTargetBody: {
            const getTarget = dialog.prompt("Select target bodies", () => {
                return objectPicker.shift(SelectionMode.Solid, 1).resource(this)
            });
            const solids = await getTarget();
            boolean.targets = [...solids];
        }

        let g: CancellablePromise<void> | undefined = undefined;
        const setToolsAndGizmo = async (selection: HasSelection) => {
            const tools = [...selection.solids];
            if (tools.length === 0) return false;

            const bbox = new THREE.Box3();
            for (const object of tools) bbox.expandByObject(object);
            bbox.getCenter(centroid);

            ReplaceGizmo: {
                g?.cancel();
                const gizmo = new MoveGizmo(boolean, editor);
                gizmo.position.copy(centroid);
                g = gizmo.execute(s => {
                    boolean.update();
                }).resource(this);
            }

            boolean.move = new THREE.Vector3();
            boolean.tools = tools;
            await boolean.update();
            return true;
        }

        GetToolsIfAlreadySelected: {
            const set = await setToolsAndGizmo(objectPicker.selection.selected);
            if (!set) await boolean.update();
        }

        dialog.replace("Select target bodies", () => {
            const objectPicker = new ObjectPicker(this.editor);
            return objectPicker.execute(selection => {
                const targets = [...objectPicker.selection.selected.solids];
                boolean.targets = targets;
                boolean.update();
            }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
        });

        const getTools = dialog.prompt("Select tool bodies", () => {
            const objectPicker = new ObjectPicker(this.editor);
            return objectPicker.execute(async selection => {
                await setToolsAndGizmo(objectPicker.selection.selected);
            }, 0, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
        });
        getTools();

        await this.finished;

        const result = await boolean.commit() as visual.Solid;
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
        objectPicker.execute(async delta => {
            const selected = objectPicker.selection.selected;
            cut.surfaces = [...selected.faces];
            cut.curves = [...selected.curves];
            cut.update();
        }, 1, Number.MAX_SAFE_INTEGER).resource(this);

        await this.finished;

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}

const centroid = new THREE.Vector3();