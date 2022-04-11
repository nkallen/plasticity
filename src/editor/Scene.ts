import signals from 'signals';
import { assertUnreachable } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { Group, GroupId, Groups, VirtualGroup } from './Groups';
import { MementoOriginator, SceneMemento } from './History';
import MaterialDatabase from "./MaterialDatabase";
import { HideMode, NodeItem, NodeKey, Nodes, RealNodeItem } from "./Nodes";
import { TypeManager } from "./TypeManager";

type Snapshot = {
    isIndirectlyHidden: boolean;
    visibleItems: Set<visual.Item>;
    visibleGroups: Set<number>;
};

export type SceneDisplayInfo = {
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

    rebuild() {
        this.signals.sceneGraphChanged.dispatch();
    }

    get visibleObjects(): visual.Item[] {
        const acc = this.computeVisibleObjectsInGroup(this.root, new Set(), new Set(), false);
        return [...acc].concat(this.db.findAutomatics());
    }

    get visibility(): SceneDisplayInfo {
        const visibleItems = new Set<visual.Item>(), visibleGroups = new Set<GroupId>();
        this.computeVisibleObjectsInGroup(this.root, visibleItems, visibleGroups, false);
        return { visibleItems, visibleGroups };
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
        } else if (start instanceof visual.Item) {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (!types.isEnabled(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            const parent = this.parent(start);
            if (start instanceof visual.Solid && !nodes.isVisible(parent.solids)) return accItem;
            if (start instanceof visual.SpaceInstance && !nodes.isVisible(parent.curves)) return accItem;
            accItem.add(start);
        } else if (start instanceof VirtualGroup) {
            return this.computeVisibleObjectsInGroup(start.parent, accItem, accGroup, checkSelectable);
        }
        return accItem;
    }

    get selectableObjects(): visual.Item[] {
        const acc = this.computeVisibleObjectsInGroup(this.root, new Set(), new Set(), true);
        return [...acc].concat(this.db.findAutomatics());
    }

    makeHidden(node: RealNodeItem, value: boolean) {
        if (value === this.isHidden(node)) return;
        const before = this.snapshot(node, false);
        this.nodes.makeHidden(node, value);
        const after = this.snapshot(node, false);
        if (before.isIndirectlyHidden === after.isIndirectlyHidden) return;
        this.processSnapshot(before, after, this.signals.objectHidden, this.signals.objectUnhidden);
        this.signals.sceneGraphChanged.dispatch();
    }

    makeVisible(node: NodeItem, value: boolean) {
        if (value === this.isVisible(node)) return;
        const before = this.snapshot(node, false);
        this.nodes.makeVisible(node, value);
        const after = this.snapshot(node, false);
        if (before.isIndirectlyHidden === after.isIndirectlyHidden) return;
        this.processSnapshot(before, after, this.signals.objectHidden, this.signals.objectUnhidden);
        this.signals.sceneGraphChanged.dispatch();
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
        this.signals.sceneGraphChanged.dispatch();
    }

    private snapshot(node: NodeItem, checkSelectable: boolean): Snapshot {
        const isIndirectlyHidden = this.isIndirectlyHidden(node) || (checkSelectable && !this.isSelectable(node));
        const visibleItems = new Set<visual.Item>();
        const visibleGroups = new Set<GroupId>();
        this.computeVisibleObjectsInGroup(node, visibleItems, visibleGroups, checkSelectable);
        return { isIndirectlyHidden, visibleItems, visibleGroups };
    }

    private processSnapshot(before: Snapshot, after: Snapshot, hide: signals.Signal<[RealNodeItem, HideMode]>, show: signals.Signal<[RealNodeItem, HideMode]>) {
        for (const item of before.visibleItems) {
            if (after.visibleItems.has(item)) continue;
            hide.dispatch([item, 'indirect']);
        }
        for (const item of after.visibleItems) {
            if (before.visibleItems.has(item)) continue;
            show.dispatch([item, 'indirect']);
        }
        for (const groupId of before.visibleGroups) {
            if (after.visibleGroups.has(groupId)) continue;
            hide.dispatch([new Group(groupId), 'indirect']);
        }
        for (const groupId of after.visibleGroups) {
            if (before.visibleGroups.has(groupId)) continue;
            show.dispatch([new Group(groupId), 'indirect']);
        }
    }

    private isIndirectlyHidden(node: NodeItem) {
        if ((node instanceof visual.Item || node instanceof Group) && this.isHidden(node)) return true;
        if (!this.isVisible(node)) return true;
        let parent = this.groups.parent(node);
        while (!parent.isRoot) {
            if (this.nodes.isHidden(parent)) return true;
            parent = this.groups.parent(parent);
        }
        return false;
    }

    parent(node: RealNodeItem): Group {
        return this.groups.parent(node);
    }
    
    moveToGroup(node: RealNodeItem, group: Group) {
        this.groups.moveNodeToGroup(node, group)
        this.signals.sceneGraphChanged.dispatch();
    }

    setMaterial(node: RealNodeItem, id: number) {
        this.nodes.setMaterial(node, id)
    }

    createGroup() {
        const result = this.groups.create();
        this.signals.sceneGraphChanged.dispatch();
        return result;
    }

    deleteGroup(group: Group) {
        this.groups.delete(group);
        this.signals.sceneGraphChanged.dispatch();
    }

    setName(node: RealNodeItem, name: string) {
        this.nodes.setName(node, name);
        this.signals.sceneGraphChanged.dispatch();
    }

    get root() { return this.groups.root }
    isHidden(node: RealNodeItem): boolean { return this.nodes.isHidden(node) }
    isVisible(node: NodeItem): boolean { return this.nodes.isVisible(node) }
    isSelectable(node: NodeItem): boolean { return this.nodes.isSelectable(node) }
    getMaterial(node: RealNodeItem): THREE.Material | undefined { return this.nodes.getMaterial(node) }
    getName(node: RealNodeItem): string | undefined { return this.nodes.getName(node) }
    key2item(key: NodeKey) { return this.nodes.key2item(key) }
    item2key(item: NodeItem) { return this.nodes.item2key(item) }
    list(group: Group) { return this.groups.list(group) }

    saveToMemento(): SceneMemento {
        return new SceneMemento(this.nodes.saveToMemento(), this.groups.saveToMemento());
    }

    restoreFromMemento(m: SceneMemento) {
        this.nodes.restoreFromMemento(m.nodes);
        this.groups.restoreFromMemento(m.groups);
    }
}