import * as THREE from 'three';
import * as c3d from '../kernel/kernel';
import { assertUnreachable } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { Empties, Empty, EmptyId } from './Empties';
import { GeometryDatabase } from './GeometryDatabase';
import { Group, GroupId, Groups, VirtualGroup, VirtualGroupType } from './Groups';
import { MementoOriginator, NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';

export type NodeDekey =
    { tag: 'Item', id: c3d.SimpleName } |
    { tag: 'Group', id: GroupId } |
    { tag: 'VirtualGroup', id: GroupId, type: VirtualGroupType } |
    { tag: 'Empty', id: EmptyId };
export type NodeKey = string;
export type NodeItem = visual.Solid | visual.SpaceInstance<visual.Curve3D> | visual.PlaneInstance<visual.Region> | Group | VirtualGroup | Empty;
export type RealNodeItem = visual.Solid | visual.SpaceInstance<visual.Curve3D> | visual.PlaneInstance<visual.Region> | Group | Empty;
export type LeafNodeItem = visual.Solid | visual.SpaceInstance<visual.Curve3D> | visual.PlaneInstance<visual.Region> | Empty;

export class Nodes implements MementoOriginator<NodeMemento> {
    static key(member: NodeDekey): NodeKey {
        switch (member.tag) {
            case 'Item':
            case 'Group':
            case 'Empty':
                return `${member.tag},${member.id}`;
            case 'VirtualGroup':
                return `${member.tag},${member.id},${member.type}`;
        }
    }

    static itemKey(id: c3d.SimpleName): NodeKey { return this.key({ tag: 'Item', id }) }
    static groupKey(id: GroupId): NodeKey { return this.key({ tag: 'Group', id }) }
    static emptyKey(id: EmptyId): NodeKey { return this.key({ tag: 'Empty', id }) }

    static dekey(k: NodeKey): NodeDekey {
        const split = k.split(',');
        const tag = split[0] as NodeDekey['tag'];
        const id = Number(split[1]);
        if (tag === 'Item' || tag === 'Group' || tag === 'Empty') return { tag, id };
        else if (tag === 'VirtualGroup') return { tag, id, type: split[2] as VirtualGroupType }
        else assertUnreachable(tag);
    }

    private readonly node2material = new Map<NodeKey, number>();
    private readonly hidden = new Set<NodeKey>();
    private readonly invisible = new Set<NodeKey>();
    private readonly unselectable = new Set<NodeKey>();
    private readonly node2name = new Map<NodeKey, string>();
    private readonly node2transform = new Map<NodeKey, ReadonlyNodeTransform>();

    constructor(
        private readonly db: GeometryDatabase,
        private readonly groups: Groups,
        private readonly empties: Empties,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) {
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.deleteItem(item);
        });
        signals.emptyRemoved.add(item => this.deleteItem(item));
        signals.groupDeleted.add(group => this.deleteItem(group));
    }

    private deleteItem(item: NodeItem) {
        const k = this.item2key(item);
        this.hidden.delete(k);
        this.invisible.delete(k);
        this.node2material.delete(k);
        this.node2name.delete(k);
        this.unselectable.delete(k);
        if (item instanceof Group) {
            this.deleteItem(item.curves);
            this.deleteItem(item.solids);
            this.deleteItem(item.empties);
        } else if (item instanceof visual.Item || item instanceof Empty) {
            this.groups.deleteMembership(k);
        }
    }

    setName(item: RealNodeItem, name: string) {
        const k = this.item2key(item);
        this.node2name.set(k, name);
        this.signals.objectNamed.dispatch([item, name]);
    }

    setTransform(item: RealNodeItem, transform: NodeTransform) {
        const k = this.item2key(item);
        this.node2transform.set(k, transform);
    }

    getName(item: RealNodeItem): string | undefined {
        const k = this.item2key(item);
        return this.node2name.get(k);
    }

    isSelectable(item: NodeItem): boolean {
        const k = this.item2key(item);
        return !this.unselectable.has(k);
    }

    makeSelectable(item: NodeItem, newValue: boolean) {
        const { unselectable } = this;
        const k = this.item2key(item);
        const oldValue = !unselectable.has(k);
        if (newValue) {
            if (oldValue) return;
            unselectable.delete(k);
        } else {
            if (!oldValue) return;
            unselectable.add(k);
        }
    }

    isHidden(item: RealNodeItem): boolean {
        const k = this.item2key(item);
        return this.hidden.has(k);
    }

    makeHidden(item: RealNodeItem, newValue: boolean) {
        const { hidden } = this;
        const k = this.item2key(item);
        const oldValue = hidden.has(k);
        if (newValue) {
            if (oldValue) return;
            hidden.add(k);
        } else {
            if (!oldValue) return;
            hidden.delete(k);
        }
    }

    makeVisible(item: NodeItem, newValue: boolean) {
        const { invisible } = this;
        const k = this.item2key(item)
        const oldValue = !invisible.has(k);
        if (newValue) {
            if (oldValue) return;
            invisible.delete(k);
        } else {
            if (!oldValue) return;
            invisible.add(k);
        }
    }

    isVisible(item: NodeItem): boolean {
        const k = this.item2key(item);
        return !this.invisible.has(k);
    }

    async unhideAll(): Promise<NodeItem[]> {
        const previouslyHidden = [];
        for (const k of this.hidden) {
            previouslyHidden.push(this.key2item(k));
        }
        this.hidden.clear();
        return previouslyHidden;
    }

    setMaterial(item: RealNodeItem, materialId: number | undefined): void {
        const { node2material } = this;
        const k = this.item2key(item);
        if (materialId === undefined) {
            node2material.delete(k);
            this.signals.itemMaterialChanged.dispatch(item);
        } else {
            node2material.set(k, materialId);
            this.signals.itemMaterialChanged.dispatch(item);
        }
    }

    getMaterial(item: RealNodeItem): THREE.Material & { color: THREE.Color } | undefined {
        const { node2material } = this;
        const k = this.item2key(item);
        const materialId = node2material.get(k);
        if (materialId === undefined) return undefined;
        else return this.materials.get(materialId)!;
    }

    getTransform(item: RealNodeItem): NodeTransform | undefined {
        const { node2transform } = this;
        const k = this.item2key(item);
        return node2transform.get(k);
    }

    saveToMemento(): NodeMemento {
        return new NodeMemento(
            new Map(this.node2material),
            new Set(this.hidden),
            new Set(this.invisible),
            new Set(this.unselectable),
            new Map(this.node2name),
            new Map(this.node2transform),
        );
    }

    restoreFromMemento(m: NodeMemento) {
        (this.node2material as Nodes['node2material']) = new Map(m.node2material);
        (this.hidden as Nodes['hidden']) = new Set(m.hidden);
        (this.invisible as Nodes['invisible']) = new Set(m.invisible);
        (this.unselectable as Nodes['unselectable']) = new Set(m.unselectable);
        (this.node2name as Nodes['node2name']) = new Map(m.node2name);
        (this.node2transform as Nodes['node2transform']) = new Map(m.node2transform);
    }

    validate() {
        for (const k of this.node2material.keys()) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item')
                console.assert(this.db.lookupById(id) !== undefined, "item in database", id);
        }
        for (const k of this.hidden) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item')
                console.assert(this.db.lookupById(id) !== undefined, "item in database", id);
        }
        for (const k of this.invisible) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item')
                console.assert(this.db.lookupById(id) !== undefined, "item in database", id);
        }
        for (const k of this.unselectable) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item')
                console.assert(this.db.lookupById(id) !== undefined, "item in database", id);
        }
        for (const k of this.node2name.keys()) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item')
                console.assert(this.db.lookupById(id) !== undefined, "item in database", id);
        }
    }

    debug() {
        console.group("Nodes");
        const { node2material: id2material, hidden, invisible, unselectable } = this;
        console.group("name2material");
        console.table([...id2material].map(([name, mat]) => { return { name, mat } }));
        console.groupEnd();
        console.group("hidden");
        console.table([...hidden].map((name) => { return { name } }));
        console.groupEnd();
        console.group("invisible");
        console.table([...invisible].map((name) => { return { name } }));
        console.groupEnd();
        console.group("unselectable");
        console.table([...unselectable].map((name) => { return { name } }));
        console.groupEnd();
        console.groupEnd();
    }

    private item2id(item: visual.Item): c3d.SimpleName {
        const { db } = this;
        const version = item.simpleName;
        const result = db.lookupId(version);
        if (result === undefined) throw new Error("invalid item: " + item.simpleName);
        return result;
    }

    item2key(item: NodeItem): NodeKey {
        if (item instanceof visual.Item)
            return Nodes.key({ tag: 'Item', id: this.item2id(item) });
        else if (item instanceof Group)
            return Nodes.key({ tag: 'Group', id: item.id });
        else if (item instanceof VirtualGroup)
            return Nodes.key({ tag: 'VirtualGroup', id: item.parent.id, type: item.type });
        else if (item instanceof Empty)
            return Nodes.key({ tag: 'Empty', id: item.simpleName });
        else assertUnreachable(item);
    }

    key2item(key: NodeKey): NodeItem {
        const dekey = Nodes.dekey(key);
        const { tag, id } = dekey;
        if (tag === 'Item') {
            return this.db.lookupById(id).view;
        } else if (tag === 'Group') {
            return this.groups.lookupById(id);
        } else if (tag === 'VirtualGroup') {
            return new VirtualGroup(this.groups.lookupById(id), dekey.type);
        } else if (tag === 'Empty') {
            return this.empties.lookupById(id);
        } else assertUnreachable(tag);
    }
}

export type HideMode = 'direct' | 'indirect';

export type NodeTransform = { position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 };
export type ReadonlyNodeTransform = Readonly<{ position: Readonly<THREE.Vector3>, quaternion: Readonly<THREE.Quaternion>, scale: Readonly<THREE.Vector3> }>;
export const NodeIdentityTransform: NodeTransform = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion,
    scale: new THREE.Vector3(1, 1, 1)
};

const freezeTransform = (transform: NodeTransform): ReadonlyNodeTransform => {
    Object.freeze(transform);
    Object.freeze(transform.position);
    Object.freeze(transform.quaternion);
    Object.freeze(transform.scale);
    return transform;
}

freezeTransform(NodeIdentityTransform);