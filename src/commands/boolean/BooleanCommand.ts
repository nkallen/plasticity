import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/SelectionModeSet";
import { CancellablePromise } from "../../util/CancellablePromise";
import * as visual from "../../visual_model/VisualModel";
import { MoveGizmo } from '../translate/MoveGizmo';
import { BooleanDialog } from "./BooleanDialog";
import { MultiBooleanFactory } from './BooleanFactory';
import { BooleanKeyboardGizmo } from "./BooleanKeyboardGizmo";

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
            dialog.render();
        }).resource(this);

        GetTargetBodies: {
            const getTarget = dialog.prompt("Select target bodies", () => {
                return objectPicker.shift(SelectionMode.Solid, 1).resource(this)
            });
            const solids = await getTarget();
            boolean.targets = [...solids];

            dialog.replace("Select target bodies", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.selection.selected.add(boolean.targets);
                objectPicker.prohibit(boolean.tools);
                return objectPicker.execute(delta => {
                    const targets = [...objectPicker.selection.selected.solids];
                    boolean.targets = targets;
                    boolean.update();
                }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
            }, () => {
                boolean.targets = [];
                boolean.update();
            });
        }

        GetToolBodies: {
            let g: CancellablePromise<void> | undefined = undefined;
            const setToolsAndGizmo = async (tools: visual.Solid[]) => {
                const bbox = new THREE.Box3();
                for (const object of tools) bbox.expandByObject(object);
                bbox.getCenter(centroid);

                ReplaceGizmo: {
                    if (g === undefined) {
                        if (tools.length > 0) {
                            const gizmo = new MoveGizmo(boolean, editor);
                            gizmo.position.copy(centroid);
                            g = gizmo.execute(s => {
                                boolean.update();
                            }).resource(this);
                        }
                    } else if (tools.length === 0) {
                        g.finish();
                        g = undefined;
                        boolean.move = new THREE.Vector3();
                    }
                }

                boolean.tools = tools;
                await boolean.update();
                return true;
            }

            const set = await setToolsAndGizmo([...objectPicker.selection.selected.solids]);
            if (!set) await boolean.update();

            dialog.prompt("Select tool bodies", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.selection.selected.add(boolean.tools);
                objectPicker.prohibit(boolean.targets);
                return objectPicker.execute(async delta => {
                    await setToolsAndGizmo([...objectPicker.selection.selected.solids]);
                }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
            }, () => setToolsAndGizmo([]))();
        }

        await this.finished;

        const results = await boolean.commit() as visual.Solid[];
        editor.selection.selected.add(results);
    }
}

const centroid = new THREE.Vector3();