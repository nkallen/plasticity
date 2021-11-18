import * as THREE from 'three';
import { Intersectable, Intersection } from '../visual_model/Intersectable';
import { ModifierStack } from '../editor/ModifierManager';
import * as visual from "../visual_model/VisualModel";
import Command, * as cmd from "./Command";
import { ExportDialog } from './export/ExportDialog';
import { ExportFactory } from './export/ExportFactory';
import { MirrorOrSymmetryFactory, SymmetryFactory } from './mirror/MirrorFactory';
import { MirrorGizmo } from './mirror/MirrorGizmo';
import { RebuildFactory } from "./rebuild/RebuildFactory";
import { RebuildKeyboardGizmo } from './rebuild/RebuildKeyboardGizmo';

/**
 * These aren't typical commands, with a set of steps and gizmos to perform a geometrical operation.
 * But these represent actions/state-changes that are meant to be atomic (for the purpose of UNDO).
 */

export abstract class CommandLike extends Command {
    remember = false;
}

// FIXME: move to site used
export class ClickChangeSelectionCommand extends CommandLike {
    point?: THREE.Vector3;

    constructor(
        editor: cmd.EditorLike,
        private readonly intersection: Intersection[]
    ) { super(editor) }


    async execute(): Promise<void> {
        this.point = this.editor.selectionInteraction.onClick(this.intersection)?.point;
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class BoxChangeSelectionCommand extends CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly intersected: Set<Intersectable>
    ) { super(editor) }

    async execute(): Promise<void> {
        this.editor.selectionInteraction.onBoxSelect(this.intersected);
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class DeselectAllCommand extends CommandLike {
    async execute(): Promise<void> {
        this.editor.selection.selected.removeAll();
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class CreatorChangeSelectionCommand extends CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly topologyItems: visual.TopologyItem[]
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { topologyItems } = this;
        this.editor.selectionInteraction.onCreatorSelect(topologyItems);
    }
}

export class RebuildCommand extends CommandLike {
    index?: number;

    constructor(
        editor: cmd.EditorLike,
    ) { super(editor) }

    async execute(): Promise<void> {
        const rebuild = new RebuildFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const item = this.editor.selection.selected.solids.first;

        rebuild.item = item;
        rebuild.index = this.index;
        if (this.index !== undefined) await rebuild.update()

        const keyboard = new RebuildKeyboardGizmo(this.editor);
        await keyboard.execute(e => {
            switch (e) {
                case 'forward':
                    rebuild.index = rebuild.index + 1;
                    break;
                case 'backward':
                    rebuild.index = rebuild.index - 1;
                    break;
            }
            rebuild.update();
        }).resource(this);

        const selection = await rebuild.commit() as visual.Solid;
        this.editor.selection.selected.removeSolid(item);
        this.editor.selection.selected.addSolid(selection);
    }
}

export class HideSelectedCommand extends CommandLike {
    async execute(): Promise<void> {
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...regions];
        for (const item of selectedItems) this.editor.db.hide(item);
        this.editor.selection.selected.removeAll();
    }
}

export class HideUnselectedCommand extends CommandLike {
    async execute(): Promise<void> {
        const db = this.editor.db;
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = new Set([...solids.ids, ...curves.ids, ...regions.ids]);
        for (const { view, model } of db.find()) {
            if (!selectedItems.has(view.simpleName)) this.editor.db.hide(view);
        }
    }
}

export class UnhideAllCommand extends CommandLike {
    async execute(): Promise<void> {
        this.editor.db.unhideAll();
    }
}

export class AddModifierCommand extends CommandLike {
    async execute(): Promise<void> {
        const { modifiers, selection } = this.editor;
        const solid = selection.selected.solids.first;

        const preview = new MirrorOrSymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        preview.item = solid;
        preview.origin = new THREE.Vector3();

        const gizmo = new MirrorGizmo(preview, this.editor);
        await gizmo.execute(s => {
            preview.update();
        }).resource(this);
        preview.cancel();


        const stack_factory = modifiers.add(solid, SymmetryFactory);
        let stack = stack_factory.stack;
        const factory = stack_factory.factory;
        factory.solid = solid;
        factory.origin = preview.origin;
        factory.quaternion = preview.quaternion;
        stack = await modifiers.rebuild(stack);

        selection.selected.addSolid(stack.modified);
    }
}

export class ApplyModifierCommand extends CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly stack: ModifierStack,
        private readonly index: number,
    ) { super(editor) }

    async execute(): Promise<void> {
        const { stack, editor: { modifiers, selection } } = this;
        const result = await modifiers.apply(stack);
        selection.selected.addSolid(result);
    }
}

export class RemoveModifierCommand extends CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly stack: ModifierStack,
        private readonly index: number,
    ) { super(editor) }

    async execute(): Promise<void> {
        const { stack, editor: { modifiers, selection } } = this;
        await modifiers.remove(stack.premodified);
        selection.selected.addSolid(stack.premodified);
    }
}

export class ExportCommand extends CommandLike {
    filePath!: string;

    async execute(): Promise<void> {
        const { editor: { db, selection: { selected } } } = this;
        const solid = selected.solids.first;
        const factory = new ExportFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.solid = solid;
        factory.filePath = this.filePath;

        const dialog = new ExportDialog(factory, this.editor.signals);
        await factory.update();
        await dialog.execute(params => {
            factory.update();
        }).resource(this);

        await factory.commit();
    }

    shouldAddToHistory(_: boolean) { return false }
}

module.hot?.accept();