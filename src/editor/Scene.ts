import signals from 'signals';
import { assertUnreachable } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { Empties, Empty, EmptyId } from './Empties';
import { GeometryDatabase } from "./GeometryDatabase";
import { Group, GroupId, GroupListing, Groups, VirtualGroup } from './Groups';
import { MementoOriginator, SceneMemento } from './History';
import MaterialDatabase from "./MaterialDatabase";
import { HideMode, LeafNodeItem, NodeDekey, NodeIdentityTransform, NodeItem, NodeKey, Nodes, NodeTransform, ReadonlyNodeTransform, RealNodeItem } from "./Nodes";
import { TypeManager } from "./TypeManager";

/**
 * The Scene (not to be confused with THREE.Scene) is a collection of all the visible/selectable objects in the
 * Plasticity universe. It coordinates the GeometryDatabase (NURBS solids and curves) and the Empties database (image planes)
 * with the Nodes (visibility/selectablility modifiers) and Groups (organization) stuff.
 * 
 * A Node is EITHER an NURBS item OR an Empty OR a Group. Nodes can be visible/hidden and have group membership relationships.
 * 
 * In the current implementation, the Nodes and Groups objects are relatively dumb collections, and the Scene is responsible
 * for keeping them up-to-date when objects are deleted and so forth.
 */

export class Scene implements MementoOriginator<SceneMemento> {
    readonly types = new TypeManager(this.signals);
    private readonly groups = new Groups(this.signals);
    private readonly nodes = new Nodes(this.db, this.groups, this.empties, this.materials, this.signals);
    cwd: Group;

    constructor(
        private readonly db: GeometryDatabase,
        private readonly empties: Empties,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) {
        this.cwd = this.root;
        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.addItem(item);
        });
        signals.emptyAdded.add(item => this.addItem(item));
    }

    validate() {
        this.nodes.validate();
        this.groups.validate();
    }

    debug() {
        this.nodes.debug();
        this.groups.debug();
    }

    duplicate<T extends Empty>(empty: T): T {
        const dup = this.empties.duplicate(empty);
        const transform = this.getTransform(empty);
        this.setTransform(dup, transform);
        return dup;
    }

    rebuild() {
        this.signals.sceneGraphChanged.dispatch();
    }

    get visibleObjects(): visual.SpaceItem[] {
        const acc = this.computeVisibleObjectsInGroup(this.root, new Set(), new Set(), false);
        return [...acc].concat(this.db.findAutomatics());
    }

    get visibility(): SceneDisplayInfo {
        const visibleItems = new Set<visual.Item>(), visibleGroups = new Set<GroupId>();
        this.computeVisibleObjectsInGroup(this.root, visibleItems, visibleGroups, false);
        return { visibleItems, visibleGroups };
    }

    private computeVisibleObjectsInGroup(start: NodeItem, accItem: Set<visual.SpaceItem>, accGroup: Set<GroupId>, checkSelectable: boolean): Set<visual.SpaceItem> {
        const { nodes, types } = this;
        if (start instanceof Group) {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            accGroup.add(start.id);
            for (const listing of this.list(start)) {
                const tag = listing.tag;
                switch (tag) {
                    case 'Group':
                        this.computeVisibleObjectsInGroup(listing.group, accItem, accGroup, checkSelectable);
                        break;
                    case 'Item':
                        this.computeVisibleObjectsInGroup(listing.item, accItem, accGroup, checkSelectable);
                        break;
                    case 'Empty':
                        this.computeVisibleObjectsInGroup(listing.empty, accItem, accGroup, checkSelectable);
                        break;
                    default: assertUnreachable(tag);
                }
            }
        } else if (start instanceof visual.Item) {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (!types.isEnabled(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            const parent = this.parent(start)!;
            if (start instanceof visual.Solid && !nodes.isVisible(parent.solids)) return accItem;
            if (start instanceof visual.SpaceInstance && !nodes.isVisible(parent.curves)) return accItem;
            if (start instanceof Empty && !nodes.isVisible(parent.empties)) return accItem;
            accItem.add(start);
        } else if (start instanceof VirtualGroup) {
            return this.computeVisibleObjectsInGroup(start.parent, accItem, accGroup, checkSelectable);
        } else if (start instanceof Empty) {
            if (nodes.isHidden(start)) return accItem;
            if (!nodes.isVisible(start)) return accItem;
            if (checkSelectable && !nodes.isSelectable(start)) return accItem;
            const parent = this.parent(start)!;
            if (!nodes.isVisible(parent.empties)) return accItem;
            accItem.add(start);
        } else assertUnreachable(start);
        return accItem;
    }

    get selectableObjects(): visual.SpaceItem[] {
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
        const visibleItems = new Set<LeafNodeItem>();
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
            hide.dispatch([this.lookupGroupById(groupId), 'indirect']);
        }
        for (const groupId of after.visibleGroups) {
            if (before.visibleGroups.has(groupId)) continue;
            show.dispatch([this.lookupGroupById(groupId), 'indirect']);
        }
    }

    private isIndirectlyHidden(node: NodeItem) {
        if ((node instanceof visual.Item || node instanceof Group || node instanceof Empty) && this.isHidden(node)) return true;
        if (!this.isVisible(node)) return true;
        let parent = this.groups.parent(this.item2key(node));
        if (parent === undefined) return false;
        while (!parent.isRoot) {
            if (this.nodes.isHidden(parent)) return true;
            parent = this.groups.parent(this.item2key(parent))!;
        }
        return false;
    }

    parent(node: RealNodeItem): Group | undefined {
        return this.groups.parent(this.item2key(node));
    }

    moveToGroup(node: RealNodeItem, group: Group) {
        this.groups.moveNodeToGroup(this.item2key(node), group)
        this.signals.sceneGraphChanged.dispatch();
    }

    setMaterial(node: RealNodeItem, id: number | undefined) {
        this.nodes.setMaterial(node, id)
    }

    createGroup(): Group {
        const result = this.groups.create();
        this.signals.sceneGraphChanged.dispatch();
        return result;
    }

    lookupGroupById(id: GroupId): Group {
        return this.groups.lookupById(id);
    }

    lookupEmptyById(id: EmptyId): Empty {
        return this.empties.lookupById(id);
    }

    deleteGroup(group: Group) {
        this.groups.delete(group);
        this.signals.sceneGraphChanged.dispatch();
    }

    deleteEmpty(empty: Empty) {
        this.empties.delete(empty);
        this.signals.sceneGraphChanged.dispatch();
    }

    setName(node: RealNodeItem, name: string) {
        this.nodes.setName(node, name);
        this.signals.sceneGraphChanged.dispatch();
    }

    setTransform(node: RealNodeItem, transform: NodeTransform) {
        this.nodes.setTransform(node, transform);
    }

    get root() { return this.groups.root }
    isHidden(node: RealNodeItem): boolean { return this.nodes.isHidden(node) }
    isVisible(node: NodeItem): boolean { return this.nodes.isVisible(node) }
    isSelectable(node: NodeItem): boolean { return this.nodes.isSelectable(node) }
    getName(node: RealNodeItem): string | undefined { return this.nodes.getName(node) }
    key2item(key: NodeKey): NodeItem { return this.nodes.key2item(key) }
    item2key(item: NodeItem): string { return this.nodes.item2key(item) }

    list(group: Group = this.root): GroupListing[] {
        const members = this.groups.list(group);
        return this.nodeDekey2GroupListing(members);
    }

    walk(group: Group): GroupListing[] {
        const members = this.groups.walk(group);
        return this.nodeDekey2GroupListing(members);
    }

    private nodeDekey2GroupListing(members: NodeDekey[]) {
        const result = [];
        for (const { tag, id } of members) {
            switch (tag) {
                case 'Group':
                    result.push({ tag, group: this.groups.lookupById(id) });
                    break;
                case 'Item':
                    result.push({ tag, item: this.db.lookupById(id).view });
                    break;
                case 'Empty':
                    result.push({ tag, empty: this.empties.lookupById(id) });
                    break;
                case 'VirtualGroup':
                    break;
                default: assertUnreachable(tag);
            }
        }
        return result;
    }

    private addItem(item: NodeItem, into = this.cwd) {
        const k = this.nodes.item2key(item);
        this.groups.addMembership(k, into);
    }

    getMaterial(node: RealNodeItem, walk = false): THREE.Material & { color: THREE.Color } | undefined {
        const thisMaterial = this.nodes.getMaterial(node);
        if (!walk || thisMaterial) return thisMaterial;
        let parent = this.parent(node);
        if (parent === undefined) return undefined;
        while (!parent.isRoot) {
            const mat = this.nodes.getMaterial(parent);
            if (mat !== undefined) return mat;
            parent = this.parent(parent)!;
        }
        return undefined;
    }

    getTransform(node: RealNodeItem, walk = false): ReadonlyNodeTransform {
        let thisTransform = this.nodes.getTransform(node);
        if (thisTransform === undefined) thisTransform = NodeIdentityTransform;
        return thisTransform;
    }

    saveToMemento(): SceneMemento {
        return new SceneMemento(
            this.cwd.id,
            this.nodes.saveToMemento(),
            this.groups.saveToMemento());
    }

    restoreFromMemento(m: SceneMemento) {
        this.nodes.restoreFromMemento(m.nodes);
        (this.cwd as Scene['cwd']) = this.lookupGroupById(m.cwd);
        this.groups.restoreFromMemento(m.groups);
    }
}

type Snapshot = {
    isIndirectlyHidden: boolean;
    visibleItems: Set<LeafNodeItem>;
    visibleGroups: Set<number>;
};

export type SceneDisplayInfo = {
    visibleItems: Set<LeafNodeItem>;
    visibleGroups: Set<number>;
};
