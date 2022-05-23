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
        for (const item of selectedItems) this.editor.scene.makeSelectable(item, false);
        this.editor.selection.selected.removeAll();
    }
}

export class HideSelectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { solids, curves, regions, empties } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...regions, ...empties];
        for (const item of selectedItems) this.editor.scene.makeHidden(item, true);
    }
}

export class HideUnselectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const db = this.editor.db;
        const { solids, curves, regions, empties } = this.editor.selection.selected;
        const selectedItems = new Set([...solids.ids, ...curves.ids, ...regions.ids]);
        for (const { view } of db.findAll()) {
            if (!selectedItems.has(view.simpleName)) this.editor.scene.makeHidden(view, true);
        }
    }
}

export class InvertHiddenCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { scene, db } = this.editor;
        for (const { view } of db.findAll()) {
            scene.makeHidden(view, !scene.isHidden(view));
        }
    }
}

export class UnhideAllCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        this.editor.scene.unhideAll();
    }
}

export class ExportCommand extends cmd.CommandLike {
    filePath!: string;

    async execute(): Promise<void> {
        const { editor: { db, selection: { selected } } } = this;
        const factory = new ExportFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.solids = [...selected.solids];
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

export class ImportCommand extends cmd.CommandLike {
    filePaths!: string[];

    async execute(): Promise<void> {
        await this.editor.importer.import(this.filePaths, this.editor.activeViewport?.constructionPlane);
    }
}

export class GroupSelectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { solids, curves, groups } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...groups];
        const group = this.editor.scene.createGroup();
        for (const item of selectedItems) this.editor.scene.moveToGroup(item, group);
    }
}

export class UngroupSelectedCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { solids, curves } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves];
        for (const item of selectedItems) this.editor.scene.moveToGroup(item, this.editor.scene.root);
    }
}
