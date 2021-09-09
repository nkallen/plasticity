import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import c3d from '../../build/Release/c3d.node';
import { ModifierStack } from '../editor/ModifierManager';
import * as visual from "../editor/VisualModel";
import Command, * as cmd from "./Command";
import { SymmetryFactory } from './mirror/MirrorFactory';
import { MirrorGizmo } from './mirror/MirrorGizmo';
import { RebuildFactory } from "./rebuild/RebuildFactory";
import { RebuildKeyboardGizmo } from './rebuild/RebuildKeyboardGizmo';
import { MoveGizmo } from './translate/MoveGizmo';
import { MoveFactory } from './translate/TranslateFactory';
import * as fs from 'fs';
import { ExportFactory } from './export/ExportFactory';

/**
 * These aren't typical commands, with a set of steps and gizmos to perform a geometrical operation.
 * But these represent actions/state-changes that are meant to be atomic (for the purpose of UNDO).
 */

export class ClickChangeSelectionCommand extends Command {
    constructor(
        editor: cmd.EditorLike,
        private readonly intersections: THREE.Intersection[]
    ) {
        super(editor);
    }

    intersection?: THREE.Intersection;

    async execute(): Promise<void> {
        const intersection = this.editor.selectionInteraction.onClick(this.intersections);
        this.intersection = intersection;
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class BoxChangeSelectionCommand extends Command {
    constructor(
        editor: cmd.EditorLike,
        private readonly selected: Set<visual.Selectable>
    ) { super(editor) }

    async execute(): Promise<void> {
        this.editor.selectionInteraction.onBoxSelect(this.selected);
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class CreatorChangeSelectionCommand extends Command {
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

export class RebuildCommand extends Command {
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

export class HideSelectedCommand extends Command {
    async execute(): Promise<void> {
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = [...solids, ...curves, ...regions];
        for (const item of selectedItems) this.editor.db.hide(item);
        this.editor.selection.selected.removeAll();
    }
}

export class HideUnselectedCommand extends Command {
    async execute(): Promise<void> {
        const db = this.editor.db;
        const { solids, curves, regions } = this.editor.selection.selected;
        const selectedItems = new Set([...solids.ids, ...curves.ids, ...regions.ids]);
        for (const { view, model } of db.find()) {
            if (!selectedItems.has(view.simpleName)) this.editor.db.hide(view);
        }
    }
}

export class UnhideAllCommand extends Command {
    async execute(): Promise<void> {
        this.editor.db.unhideAll();
    }
}

export class DuplicateCommand extends Command {
    async execute(): Promise<void> {
        const { solids, curves } = this.editor.selection.selected;
        const db = this.editor.db;

        const promises: Promise<visual.Item>[] = [];
        for (const solid of solids) promises.push(db.duplicate(solid));
        for (const curve of curves) promises.push(db.duplicate(curve));

        const objects = await Promise.all(promises);

        const bbox = new THREE.Box3();
        for (const object of objects) bbox.expandByObject(object);
        const centroid = new THREE.Vector3();
        bbox.getCenter(centroid);

        const move = new MoveFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        move.pivot = centroid;
        move.items = objects;

        const gizmo = new MoveGizmo(move, this.editor);
        gizmo.position.copy(centroid);
        await gizmo.execute(s => {
            move.update();
        }).resource(this);

        const selection = await move.commit();
        this.editor.selection.selected.add(selection);
    }
}

export class AddModifierCommand extends Command {
    async execute(): Promise<void> {
        const { modifiers, selection } = this.editor;
        const solid = selection.selected.solids.first;

        const preview = new SymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        preview.solid = solid;
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
        factory.orientation = preview.orientation;
        stack = await modifiers.rebuild(stack);

        selection.selected.addSolid(stack.modified);
    }
}

export class ApplyModifierCommand extends Command {
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

export class RemoveModifierCommand extends Command {
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

export class ExportOBJCommand extends Command {
    filePath!: string;

    async execute(): Promise<void> {
        const { editor: { db, selection: { selected } } } = this;
        const solid = selected.solids.first;
        const factory = new ExportFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.solid = solid;
        await factory.update();
        await factory.commit();

    }

    shouldAddToHistory(selectionChanged: boolean) {
        return false;
    }
}

module.hot?.accept();