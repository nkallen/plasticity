import * as visual from "../visual_model/VisualModel";
import * as cmd from "../command/Command";
import { ExportDialog } from './export/ExportDialog';
import { ExportFactory } from './export/ExportFactory';
import { RebuildFactory } from "./rebuild/RebuildFactory";
import { RebuildKeyboardGizmo } from './rebuild/RebuildKeyboardGizmo';

/**
 * These aren't typical commands, with a set of steps and gizmos to perform a geometrical operation.
 * But these represent actions/state-changes that are meant to be atomic (for the purpose of UNDO).
 */

export class DeselectAllCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        this.editor.selection.selected.removeAll();
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class RebuildCommand extends cmd.CommandLike {
    index?: number;

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

export class LockSelectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...regions];
        for (const item of selectedItems) this.editor.db.makeSelectable(item, false);
        this.editor.selection.selected.removeAll();
    }
}

export class HideSelectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...regions];
        for (const item of selectedItems) this.editor.db.makeHidden(item, true);
        this.editor.selection.selected.removeAll();
    }
}

export class HideUnselectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const db = this.editor.db;
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = new Set([...solids.ids, ...curves.ids, ...regions.ids]);
        for (const { view } of db.findAll()) {
            if (!selectedItems.has(view.simpleName)) this.editor.db.makeHidden(view, true);
        }
    }
}

export class InvertHiddenCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const db = this.editor.db;
        for (const { view } of db.findAll()) {
            db.makeHidden(view, !db.isHidden(view));
        }
    }
}

export class UnhideAllCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        this.editor.db.unhideAll();
    }
}

export class ExportCommand extends cmd.CommandLike {
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

export class SetMaterialCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { editor: { db, selection: { selected } } } = this;
        const view = selected.solids.first;
        const model = db.lookup(view);
        model.SetStyle(1);
    }
}

module.hot?.accept();