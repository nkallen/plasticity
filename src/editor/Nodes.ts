import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { MementoOriginator, NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import { GeometryDatabase } from './GeometryDatabase';
import { GroupId } from './Group';

export type Node = { tag: 'Item', id: c3d.SimpleName } | { tag: 'Group', id: GroupId }
export type NodeKey = string;

export class Nodes implements MementoOriginator<NodeMemento> {
    static key(member: Node): NodeKey {
        return `${member.tag},${member.id}`;
    }

    static itemKey(id: c3d.SimpleName) { return this.key({ tag: 'Item', id }) }
    static groupKey(id: GroupId) { return this.key({ tag: 'Group', id }) }

    static dekey(k: NodeKey): Node {
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

    private addItem(item: visual.Item) {
    }

    private deleteItem(item: visual.Item) {
        const k = this.item2key(item);
        this.hidden.delete(k);
        this.invisible.delete(k);
        this.node2material.delete(k);
        this.node2name.delete(k);
        this.unselectable.delete(k)
    }

    setName(item: visual.Item, name: string) {
        const k = this.item2key(item);
        return this.node2name.set(k, name);
    }

    getName(item: visual.Item): string | undefined {
        const k = this.item2key(item);
        return this.node2name.get(k);
    }

    isSelectable(item: visual.Item): boolean {
        const k = this.item2key(item);
        return !this.unselectable.has(k);
    }

    makeSelectable(item: visual.Item, newValue: boolean) {
        const { unselectable } = this;
        const k = this.item2key(item);
        const oldValue = !unselectable.has(k);
        if (newValue) {
            if (oldValue) return;
            unselectable.delete(k);
            this.signals.objectSelectable.dispatch(item);
        } else {
            if (!oldValue) return;
            unselectable.add(k);
            this.signals.objectUnselectable.dispatch(item);
        }
    }

    isHidden(item: visual.Item): boolean {
        const k = this.item2key(item);
        return this.hidden.has(k);
    }

    makeHidden(item: visual.Item, newValue: boolean) {
        const { hidden } = this;
        const k = this.item2key(item);
        const oldValue = hidden.has(k);
        if (newValue) {
            if (oldValue)
                return;
            hidden.add(k);
            this.signals.objectHidden.dispatch(item);
        } else {
            if (!oldValue)
                return;
            hidden.delete(k);
            this.signals.objectUnhidden.dispatch(item);
        }
    }

    makeVisible(item: visual.Item, newValue: boolean) {
        const { invisible } = this;
        const k = this.item2key(item)
        const oldValue = !invisible.has(k);
        if (newValue) {
            if (oldValue) return;
            invisible.delete(k);
            this.signals.objectUnhidden.dispatch(item);
        } else {
            if (!oldValue) return;
            invisible.add(k);
            this.signals.objectHidden.dispatch(item);
        }
    }

    isVisible(item: visual.Item): boolean {
        const k = this.item2key(item);
        return !this.invisible.has(k);
    }

    async unhideAll(): Promise<visual.Item[]> {
        const hidden = []
        for (const k of this.hidden) {
            const { tag, id } = Nodes.dekey(k);
            if (tag === 'Item') hidden.push(this.db.lookupById(id));
        }
        this.hidden.clear();
        const views = hidden.map(h => h.view);
        for (const view of views) this.signals.objectUnhidden.dispatch(view);
        return views;
    }

    setMaterial(item: visual.Item, materialId: number): void {
        const { node2material } = this;
        const k = this.item2key(item);
        node2material.set(k, materialId);
        this.signals.itemMaterialChanged.dispatch(item);
    }

    getMaterial(item: visual.Item): THREE.Material | undefined {
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
        (this.node2name as Nodes['node2name']) = new Map(m.id2name);
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

    private item2key(item: visual.Item): NodeKey {
        return Nodes.key({ tag: 'Item', id: this.item2id(item) });
    }
}
