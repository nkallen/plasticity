import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { MementoOriginator, NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import { GeometryDatabase } from './GeometryDatabase';
import { Group, GroupId } from './Group';

export type NodeDekey = { tag: 'Item', id: c3d.SimpleName } | { tag: 'Group', id: GroupId }
export type NodeKey = string;
export type NodeItem = visual.Item | Group;

export class Nodes implements MementoOriginator<NodeMemento> {
    static key(member: NodeDekey): NodeKey {
        return `${member.tag},${member.id}`;
    }

    static itemKey(id: c3d.SimpleName): NodeKey { return this.key({ tag: 'Item', id }) }
    static groupKey(id: GroupId): NodeKey { return this.key({ tag: 'Group', id }) }

    static dekey(k: NodeKey): NodeDekey {
        const split = k.split(',');
        const tag = split[0];
        const id = Number(split[1]);
        if (tag !== 'Item' && tag !== 'Group') throw new Error("Invalid key " + k);
        return { tag, id };
    }

    private readonly node2material = new Map<NodeKey, number>();
    private readonly hidden = new Set<NodeKey>();
    private readonly invisible = new Set<NodeKey>();
    private readonly unselectable = new Set<NodeKey>();
    private readonly node2name = new Map<NodeKey, string>();

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) {
        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.addItem(item);
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.deleteItem(item);
        });
    }

    private addItem(item: NodeItem) {
    }

    private deleteItem(item: NodeItem) {
        const k = this.item2key(item);
        this.hidden.delete(k);
        this.invisible.delete(k);
        this.node2material.delete(k);
        this.node2name.delete(k);
        this.unselectable.delete(k)
    }

    setName(item: NodeItem, name: string) {
        const k = this.item2key(item);
        this.node2name.set(k, name);
        this.signals.objectNamed.dispatch([item, name]);
    }

    getName(item: NodeItem): string | undefined {
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

    isHidden(item: NodeItem): boolean {
        const k = this.item2key(item);
        return this.hidden.has(k);
    }

    makeHidden(item: NodeItem, newValue: boolean) {
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
        const hidden = [];
        for (const k of this.hidden) {
            hidden.push(this.key2item(k));
        }
        this.hidden.clear();
        return hidden;
    }

    setMaterial(item: NodeItem, materialId: number): void {
        const { node2material } = this;
        const k = this.item2key(item);
        node2material.set(k, materialId);
        this.signals.itemMaterialChanged.dispatch(item);
    }

    getMaterial(item: NodeItem): THREE.Material | undefined {
        const { node2material: version2material } = this;
        const k = this.item2key(item);
        const materialId = version2material.get(k);
        if (materialId === undefined)
            return undefined;
        else
            return this.materials.get(materialId)!;
    }

    saveToMemento(): NodeMemento {
        return new NodeMemento(
            new Map(this.node2material),
            new Set(this.hidden),
            new Set(this.invisible),
            new Set(this.unselectable),
            new Map(this.node2name),
        );
    }

    restoreFromMemento(m: NodeMemento) {
        (this.node2material as Nodes['node2material']) = new Map(m.node2material);
        (this.hidden as Nodes['hidden']) = new Set(m.hidden);
        (this.invisible as Nodes['invisible']) = new Set(m.invisible);
        (this.unselectable as Nodes['unselectable']) = new Set(m.unselectable);
        (this.node2name as Nodes['node2name']) = new Map(m.node2name);
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
        else
            return Nodes.key({ tag: 'Group', id: item.id });
    }

    key2item(key: NodeKey): NodeItem {
        const { tag, id } = Nodes.dekey(key);
        if (tag === 'Item') {
            return this.db.lookupById(id).view;
        } else {
            return new Group(id);
        }
    }
}

export type HideMode = 'direct' | 'indirect';