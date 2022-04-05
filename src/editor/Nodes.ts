import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { MementoOriginator, NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import { GeometryDatabase } from './GeometryDatabase';


export class Nodes implements MementoOriginator<NodeMemento> {
    private readonly id2material = new Map<c3d.SimpleName, number>();
    private readonly hidden = new Set<c3d.SimpleName>();
    private readonly invisible = new Set<c3d.SimpleName>();
    private readonly unselectable = new Set<c3d.SimpleName>();
    private readonly id2name = new Map<c3d.SimpleName, string>();

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) { }

    delete(version: c3d.SimpleName) {
        const id = this.db.lookupId(version)!;
        this.hidden.delete(id);
        this.invisible.delete(id);
        this.id2material.delete(id);
        this.id2name.delete(id);
        this.unselectable.delete(id)
    }

    setName(item: visual.Item, name: string) {
        const id = this.db.lookupId(item.simpleName)!;
        return this.id2name.set(id, name);
    }

    getName(item: visual.Item): string | undefined {
        const id = this.db.lookupId(item.simpleName)!;
        return this.id2name.get(id);
    }

    isSelectable(item: visual.Item): boolean {
        const id = this.db.lookupId(item.simpleName)!;
        return !this.unselectable.has(id);
    }

    makeSelectable(item: visual.Item, newValue: boolean) {
        const { unselectable } = this;
        const id = this.db.lookupId(item.simpleName)!;
        const oldValue = !unselectable.has(id);
        if (newValue) {
            if (oldValue) return;
            unselectable.delete(id);
            this.signals.objectSelectable.dispatch(item);
        } else {
            if (!oldValue) return;
            unselectable.add(id);
            this.signals.objectUnselectable.dispatch(item);
        }
    }

    isHidden(item: visual.Item): boolean {
        const id = this.db.lookupId(item.simpleName)!;
        return this.hidden.has(id);
    }

    makeHidden(item: visual.Item, newValue: boolean) {
        const { hidden } = this;
        const id = this.db.lookupId(item.simpleName)!;
        const oldValue = hidden.has(id);
        if (newValue) {
            if (oldValue)
                return;
            hidden.add(id);
            this.signals.objectHidden.dispatch(item);
        } else {
            if (!oldValue)
                return;
            hidden.delete(id);
            this.signals.objectUnhidden.dispatch(item);
        }
    }

    makeVisible(item: visual.Item, newValue: boolean) {
        const { invisible } = this;
        const name = this.db.lookupId(item.simpleName)!;
        const oldValue = !invisible.has(name);
        if (newValue) {
            if (oldValue) return;
            invisible.delete(name);
            this.signals.objectUnhidden.dispatch(item);
        } else {
            if (!oldValue) return;
            invisible.add(name);
            this.signals.objectHidden.dispatch(item);
        }
    }

    isVisible(item: visual.Item): boolean {
        const id = this.db.lookupId(item.simpleName)!;
        return !this.invisible.has(id);
    }

    async unhideAll(): Promise<visual.Item[]> {
        const hidden = [...this.hidden].map(name => this.db.lookupById(name));
        this.hidden.clear();
        const views = hidden.map(h => h.view);
        for (const view of views) this.signals.objectUnhidden.dispatch(view);
        return views;
    }

    setMaterial(item: visual.Item, materialId: number): void {
        const { id2material: name2material } = this;
        const id = this.db.lookupId(item.simpleName)!;
        name2material.set(id, materialId);
        this.signals.sceneGraphChanged.dispatch();
    }

    getMaterial(item: visual.Item): THREE.Material | undefined {
        const { id2material: version2material } = this;
        const id = this.db.lookupId(item.simpleName)!;
        const materialId = version2material.get(id);
        if (materialId === undefined)
            return undefined;
        else
            return this.materials.get(materialId)!;
    }

    saveToMemento(): NodeMemento {
        return new NodeMemento(
            new Map(this.id2material),
            new Set(this.hidden),
            new Set(this.invisible),
            new Set(this.unselectable),
            new Map(this.id2name),
        );
    }

    restoreFromMemento(m: NodeMemento) {
        (this.id2material as Nodes['id2material']) = new Map(m.id2material);
        (this.hidden as Nodes['hidden']) = new Set(m.hidden);
        (this.invisible as Nodes['invisible']) = new Set(m.invisible);
        (this.unselectable as Nodes['unselectable']) = new Set(m.unselectable);
        (this.id2name as Nodes['id2name']) = new Map(m.id2name);
    }

    validate() {
        for (const name of this.id2material.keys()) {
            console.assert(this.db.lookupById(name) !== undefined, "item in database", name);
        }
        for (const name of this.hidden) {
            console.assert(this.db.lookupById(name) !== undefined, "item in database", name);
        }
        for (const name of this.invisible) {
            console.assert(this.db.lookupById(name) !== undefined, "item in database", name);
        }
        for (const name of this.unselectable) {
            console.assert(this.db.lookupById(name) !== undefined, "item in database", name);
        }
    }

    debug() {
        console.group("Nodes");
        const { id2material, hidden, invisible, unselectable } = this;
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
}
