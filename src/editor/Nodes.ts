import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { NodeMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import { GeometryDatabase } from './GeometryDatabase';


export class Nodes {
    private readonly name2material = new Map<c3d.SimpleName, number>();
    private readonly hidden = new Set<c3d.SimpleName>();
    private readonly invisible = new Set<c3d.SimpleName>();
    private readonly unselectable = new Set<c3d.SimpleName>();

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) { }

    delete(name: c3d.SimpleName) {
        this.hidden.delete(name);
        this.invisible.delete(name);
        this.invisible.delete(name);
        this.name2material.delete(name);
    }

    isSelectable(item: visual.Item): boolean {
        return !this.unselectable.has(item.simpleName);
    }

    makeSelectable(item: visual.Item, newValue: boolean) {
        const { unselectable } = this;
        const oldValue = !unselectable.has(item.simpleName);
        if (newValue) {
            if (oldValue)
                return;
            unselectable.delete(item.simpleName);
            this.signals.objectSelectable.dispatch(item);
        } else {
            if (!oldValue)
                return;
            unselectable.add(item.simpleName);
            this.signals.objectUnselectable.dispatch(item);
        }
    }

    isHidden(item: visual.Item): boolean {
        return this.hidden.has(item.simpleName);
    }

    async makeHidden(item: visual.Item, newValue: boolean) {
        const { hidden } = this;
        const oldValue = hidden.has(item.simpleName);
        if (newValue) {
            if (oldValue)
                return;
            hidden.add(item.simpleName);
            this.signals.objectHidden.dispatch(item);
        } else {
            if (!oldValue)
                return;
            hidden.delete(item.simpleName);
            this.signals.objectUnhidden.dispatch(item);
        }
    }

    async makeVisible(item: visual.Item, newValue: boolean) {
        const { invisible } = this;
        const oldValue = !invisible.has(item.simpleName);
        if (newValue) {
            if (oldValue)
                return;
            invisible.delete(item.simpleName);
            this.signals.objectUnhidden.dispatch(item);
        } else {
            if (!oldValue)
                return;
            invisible.add(item.simpleName);
            this.signals.objectHidden.dispatch(item);
        }
    }

    isVisible(item: visual.Item): boolean {
        return !this.invisible.has(item.simpleName);
    }

    async unhideAll(): Promise<visual.Item[]> {
        const hidden = [...this.hidden].map(id => this.db.lookupItemById(id));
        this.hidden.clear();
        const views = hidden.map(h => h.view);
        for (const view of views)
            this.signals.objectUnhidden.dispatch(view);
        return views;
    }

    setMaterial(item: visual.Item, id: number): void {
        const { name2material } = this;
        name2material.set(this.db.lookupName(item.simpleName)!, id);
        this.signals.sceneGraphChanged.dispatch();
    }

    getMaterial(item: visual.Item): THREE.Material | undefined {
        const { name2material: version2material } = this;
        const materialId = version2material.get(this.db.lookupName(item.simpleName)!);
        if (materialId === undefined)
            return undefined;
        else
            return this.materials.get(materialId)!;
    }

    saveToMemento(): NodeMemento {
        return new NodeMemento(
            new Map(this.name2material),
            new Set(this.hidden),
            new Set(this.invisible));
    }

    restoreFromMemento(m: NodeMemento) {
        (this.name2material as Nodes['name2material']) = new Map(m.name2material);
        (this.hidden as Nodes['hidden']) = new Set(m.hidden);
        (this.invisible as Nodes['invisible']) = new Set(m.invisible);
    }
}
