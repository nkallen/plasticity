import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import * as visual from "../editor/VisualModel";
import { GizmoLike } from "./AbstractGizmo";
import Command, * as cmd from "./Command";
import { RebuildFactory } from "./rebuild/RebuildFactory";
import { MoveGizmo } from './translate/MoveGizmo';
import { MoveFactory } from './translate/TranslateFactory';

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
}

export class BoxChangeSelectionCommand extends Command {
    constructor(
        editor: cmd.EditorLike,
        private readonly selected: Set<visual.Selectable>
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        this.editor.selectionInteraction.onBoxSelect(this.selected);
    }
}

export class RebuildCommand extends Command {
    dup: c3d.Item;

    constructor(
        editor: cmd.EditorLike,
        private readonly item: visual.Item,
        private readonly element: GizmoLike<() => void>
    ) {
        super(editor);

        const model = this.editor.db.lookup(item);
        this.dup = model.Duplicate().Cast<c3d.Item>(model.IsA());
    }

    async execute(): Promise<void> {
        const factory = new RebuildFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.item = this.item;
        factory.dup = this.dup;
        await this.element.execute(async () => {
            await factory.update();
        }).resource(this);
        const selection = await factory.commit() as visual.Solid;
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