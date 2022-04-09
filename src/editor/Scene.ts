import signals from 'signals';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { Group, GroupId, Groups } from './Group';
import { MementoOriginator, SceneMemento } from './History';
import MaterialDatabase from "./MaterialDatabase";
import { HideMode, NodeItem, NodeKey, Nodes } from "./Nodes";
import { TypeManager } from "./TypeManager";

type Snapshot = {
    isIndirectlyHidden: boolean;
    visibleItems: Set<visual.Item>;
    visibleGroups: Set<number>;
};

export class Scene implements MementoOriginator<SceneMemento> {
    readonly types = new TypeManager(this.signals);
    private readonly nodes = new Nodes(this.db, this.materials, this.signals);
    private readonly groups = new Groups(this.db, this.signals);

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) {
    }

    validate() {
        this.nodes.validate();
        this.groups.validate();
    }

    debug() {
        this.nodes.debug();
        this.groups.debug();
    }

    get visibleObjects(): visual.Item[] {
        const acc = this.computeVisibleObjectsInGroup(this.root, new Set(), new Set(), false);
        return [...acc].concat(this.db.findAutomatics());
    }

    private computeVisibleObjectsInGroup(start: NodeItem, accItem: Set<visual.Item>, accGroup: Set<GroupId>, checkSelectable: boolean): Set<visual.Item> {
        const { nodes, types } = this;
        if (start instanceof Group) {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            accGroup.add(start.id);
            for (const listing of this.list(start)) {
                switch (listing.tag) {
                    case 'Group':
                        this.computeVisibleObjectsInGroup(listing.group, accItem, accGroup, checkSelectable);
                        break;
                    case 'Item':
                        this.computeVisibleObjectsInGroup(listing.item, accItem, accGroup, checkSelectable);
                        break;
                }
            }
        } else {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (!types.isEnabled(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            accItem.add(start);
        }
        return accItem;
    }

    get selectableObjects(): visual.Item[] {
        const acc = this.computeVisibleObjectsInGroup(this.root, new Set(), new Set(), true);
        return [...acc].concat(this.db.findAutomatics());
    }

    makeHidden(node: NodeItem, value: boolean) {
        if (value === this.isHidden(node)) return;
        const before = this.snapshot(node, false);
        this.nodes.makeHidden(node, value);
        const after = this.snapshot(node, false);
        if (before.isIndirectlyHidden === after.isIndirectlyHidden) return;
        this.processSnapshot(before, after, this.signals.objectHidden, this.signals.objectUnhidden);
    }

    makeVisible(node: NodeItem, value: boolean) {
        if (value === this.isVisible(node)) return;
        const before = this.snapshot(node, false);
        this.nodes.makeVisible(node, value);
        const after = this.snapshot(node, false);
        if (before.isIndirectlyHidden === after.isIndirectlyHidden) return;
        this.processSnapshot(before, after, this.signals.objectHidden, this.signals.objectUnhidden);
    }

    async unhideAll(): Promise<NodeItem[]> {
        const before = this.snapshot(this.groups.root, false);
        const result = await this.nodes.unhideAll();
        const after = this.snapshot(this.groups.root, false);
        this.processSnapshot(before, after, this.signals.objectHidden, this.signals.objectUnhidden);
        return result;
    }

    makeSelectable(node: NodeItem, value: boolean) {
        const before = this.snapshot(node, true);
        this.nodes.makeSelectable(node, value);
        const after = this.snapshot(node, true);
        if (before.isIndirectlyHidden === after.isIndirectlyHidden) return;
        this.processSnapshot(before, after, this.signals.objectUnselectable, this.signals.objectSelectable);
    }

    private snapshot(node: NodeItem, checkSelectable: boolean): Snapshot {
        const isIndirectlyHidden = this.isIndirectlyHidden(node) || (checkSelectable && !this.isSelectable(node));
        const visibleItems = new Set<visual.Item>();
        const visibleGroups = new Set<GroupId>();
        this.computeVisibleObjectsInGroup(node, visibleItems, visibleGroups, checkSelectable);
        return { isIndirectlyHidden, visibleItems, visibleGroups };
    }

    private processSnapshot(before: Snapshot, after: Snapshot, positive: signals.Signal<[NodeItem, HideMode]>, negative: signals.Signal<[NodeItem, HideMode]>) {
        for (const item of before.visibleItems) {
            if (after.visibleItems.has(item)) continue;
            positive.dispatch([item, 'indirect']);
        }
        for (const item of after.visibleItems) {
            if (before.visibleItems.has(item)) continue;
            negative.dispatch([item, 'indirect']);
        }
        for (const groupId of before.visibleGroups) {
            if (after.visibleGroups.has(groupId)) continue;
            positive.dispatch([new Group(groupId), 'indirect']);
        }
        for (const groupId of after.visibleGroups) {
            if (before.visibleGroups.has(groupId)) continue;
            negative.dispatch([new Group(groupId), 'indirect']);
        }
    }

    private isIndirectlyHidden(node: NodeItem) {
        if (this.isHidden(node) || !this.isVisible(node)) return true;
        let parent = this.groups.parent(node);
        while (!parent.isRoot) {
            if (this.nodes.isHidden(parent)) return true;
            parent = this.groups.parent(parent);
        }
        return false;
    }

    deleteGroup(group: Group) { this.groups.delete(group) }
    moveToGroup(node: NodeItem, group: Group) { this.groups.moveNodeToGroup(node, group) }
    setMaterial(node: NodeItem, id: number): void { this.nodes.setMaterial(node, id) }
    createGroup() { const result = this.groups.create(); return result; }

    get root() { return this.groups.root }
    isHidden(node: NodeItem): boolean { return this.nodes.isHidden(node) }
    isVisible(node: NodeItem): boolean { return this.nodes.isVisible(node) }
    isSelectable(node: NodeItem): boolean { return this.nodes.isSelectable(node) }
    getMaterial(node: NodeItem): THREE.Material | undefined { return this.nodes.getMaterial(node) }
    getName(node: NodeItem): string | undefined { return this.nodes.getName(node) }
    setName(node: NodeItem, name: string) { this.nodes.setName(node, name) }
    key2item(key: NodeKey) { return this.nodes.key2item(key) }
    item2key(item: NodeItem) { return this.nodes.item2key(item) }
    list(group: Group) { return this.groups.list(group) }

    saveToMemento(): SceneMemento {
        return new SceneMemento(this.nodes.saveToMemento(), this.groups.saveToMemento());
    }

    restoreFromMemento(m: SceneMemento): void {
        this.nodes.restoreFromMemento(m.nodes);
        this.groups.restoreFromMemento(m.groups);
    }
}