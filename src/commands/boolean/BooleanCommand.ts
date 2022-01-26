import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
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

            const getTools = dialog.prompt("Select tool bodies", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.selection.selected.add(boolean.tools);
                objectPicker.prohibit(boolean.targets);
                return objectPicker.execute(async delta => {
                    await setToolsAndGizmo([...objectPicker.selection.selected.solids]);
                }, 0, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
            }, () => setToolsAndGizmo([]));
            getTools();
        }

        await this.finished;

        const results = await boolean.commit() as visual.Solid[];
        editor.selection.selected.add(results);
    }
}

export class CutCommand extends Command {
    async execute(): Promise<void> {
        const cut = new MultiCutFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        cut.constructionPlane = this.editor.activeViewport?.constructionPlane;

        const gizmo = new CutGizmo(cut, this.editor);
        const dialog = new CutDialog(cut, this.editor.signals);
        let objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);

        dialog.execute(async (params) => {
            await cut.update();
        }).resource(this);

        gizmo.execute(async (params) => {
            await cut.update();
        }).resource(this);

        GetTargetBodies: {
            const getTarget = dialog.prompt("Select target bodies", () => {
                return objectPicker.slice(SelectionMode.Solid, 1, Number.MAX_SAFE_INTEGER).resource(this)
            });
            const solids = await getTarget();
            cut.solids = [...solids];

            dialog.replace("Select target bodies", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.selection.selected.add(cut.solids);
                return objectPicker.execute(delta => {
                    const solids = [...objectPicker.selection.selected.solids];
                    cut.solids = solids;
                    cut.update();
                }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
            }, () => {
                cut.solids = [];
                cut.update();
            });
        }

        GetCutters: {
            cut.curves = [...this.editor.selection.selected.curves];
            cut.surfaces = [...this.editor.selection.selected.faces];
            await cut.update();    

            dialog.prompt("Select cutters", () => {
                const objectPicker = new ObjectPicker(this.editor);
                objectPicker.mode.set(SelectionMode.Curve, SelectionMode.Face);
                objectPicker.selection.selected.add(cut.faces);
                objectPicker.selection.selected.add(cut.curves);
                return objectPicker.execute(async delta => {
                    const selected = objectPicker.selection.selected;
                    cut.surfaces = [...selected.faces];
                    cut.curves = [...selected.curves];
                    cut.update();
                }, 1, Number.MAX_SAFE_INTEGER).resource(this);
            }, () => {
                cut.surfaces = []; cut.curves = [];
                cut.update();
            })();
        }

        objectPicker = new ObjectPicker(this.editor);
        objectPicker.mode.set(SelectionMode.Face, SelectionMode.Curve);

        await this.finished;

        const results = await cut.commit() as visual.Solid[];
        this.editor.selection.selected.addSolid(results[0]);
    }
}

const centroid = new THREE.Vector3();