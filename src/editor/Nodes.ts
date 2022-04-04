import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { MementoOriginator, NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import { GeometryDatabase } from './GeometryDatabase';


export class Nodes implements MementoOriginator<NodeMemento> {
    private readonly name2material = new Map<c3d.SimpleName, number>();
    private readonly hidden = new Set<c3d.SimpleName>();
    private readonly invisible = new Set<c3d.SimpleName>();
    private readonly unselectable = new Set<c3d.SimpleName>();

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) { }

    delete(version: c3d.SimpleName) {
        const name = this.db.lookupName(version)!;
        this.hidden.delete(name);
        this.invisible.delete(name);
        this.name2material.delete(name);
        this.unselectable.delete(name)
    }

    isSelectable(item: visual.Item): boolean {
        const name = this.db.lookupName(item.simpleName)!;
        return !this.unselectable.has(name);
    }

    makeSelectable(item: visual.Item, newValue: boolean) {
        const { unselectable } = this;
        const name = this.db.lookupName(item.simpleName)!;
        const oldValue = !unselectable.has(name);
        if (newValue) {
            if (oldValue) return;
            unselectable.delete(name);
            this.signals.objectSelectable.dispatch(item);
        } else {
            if (!oldValue) return;
            unselectable.add(name);
            this.signals.objectUnselectable.dispatch(item);
        }
    }

    isHidden(item: visual.Item): boolean {
        const name = this.db.lookupName(item.simpleName)!;
        return this.hidden.has(name);
    }

     makeHidden(item: visual.Item, newValue: boolean) {
        const { hidden } = this;
        const name = this.db.lookupName(item.simpleName)!;
        const oldValue = hidden.has(name);
        if (newValue) {
            if (oldValue)
                return;
            hidden.add(name);
            this.signals.objectHidden.dispatch(item);
        } else {
            if (!oldValue)
                return;
            hidden.delete(name);
            this.signals.objectUnhidden.dispatch(item);
        }
    }

     makeVisible(item: visual.Item, newValue: boolean) {
        const { invisible } = this;
        const name = this.db.lookupName(item.simpleName)!;
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
        const name = this.db.lookupName(item.simpleName)!;
        return !this.invisible.has(name);
    }

    async unhideAll(): Promise<visual.Item[]> {
        const hidden = [...this.hidden].map(name => this.db.lookupByName(name));
        this.hidden.clear();
        const views = hidden.map(h => h.view);
        for (const view of views) this.signals.objectUnhidden.dispatch(view);
        return views;
    }

    setMaterial(item: visual.Item, id: number): void {
        const { name2material } = this;
        const name = this.db.lookupName(item.simpleName)!;
        name2material.set(name, id);
        this.signals.sceneGraphChanged.dispatch();
    }

    getMaterial(item: visual.Item): THREE.Material | undefined {
        const { name2material: version2material } = this;
        const name = this.db.lookupName(item.simpleName)!;
        const materialId = version2material.get(name);
        if (materialId === undefined)
            return undefined;
        else
            return this.materials.get(materialId)!;
    }

    saveToMemento(): NodeMemento {
        return new NodeMemento(
            new Map(this.name2material),
            new Set(this.hidden),
            new Set(this.invisible),
            new Set(this.unselectable),
            );
    }

    restoreFromMemento(m: NodeMemento) {
        (this.name2material as Nodes['name2material']) = new Map(m.name2material);
        (this.hidden as Nodes['hidden']) = new Set(m.hidden);
        (this.invisible as Nodes['invisible']) = new Set(m.invisible);
        (this.unselectable as Nodes['unselectable']) = new Set(m.unselectable);
    }

    validate() {
        for (const name of this.name2material.keys()) {
            console.assert(this.db.lookupByName(name) !== undefined, "item in database", name);
        }
        for (const name of this.hidden) {
            console.assert(this.db.lookupByName(name) !== undefined, "item in database", name);
        }
        for (const name of this.invisible) {
            console.assert(this.db.lookupByName(name) !== undefined, "item in database", name);
        }
        for (const name of this.unselectable) {
            console.assert(this.db.lookupByName(name) !== undefined, "item in database", name);
        }
    }

    debug() {
        console.group("Nodes");
        const { name2material, hidden, invisible, unselectable } = this;
        console.group("name2material");
        console.table([...name2material].map(([name, mat]) => { return { name, mat } }));
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
