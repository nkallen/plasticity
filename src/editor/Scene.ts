import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { MementoOriginator, NodeMemento } from "./History";
import MaterialDatabase from "./MaterialDatabase";
import { Nodes } from "./Nodes";
import { TypeManager } from "./TypeManager";

export class Scene implements MementoOriginator<NodeMemento> {
    readonly types = new TypeManager(this.signals);
    readonly nodes = new Nodes(this.db, this.materials, this.signals);

    constructor(private readonly db: GeometryDatabase, private readonly materials: MaterialDatabase, private readonly signals: EditorSignals) {
        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.add(item);
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.delete(item);
        });
    }

    validate(): void {
    }
    debug(): void {
    }

    private add(item: visual.Item) {
    }

    private delete(item: visual.Item) {
        this.nodes.delete(item.simpleName);
    }

    get visibleObjects(): visual.Item[] {
        const { nodes, types } = this;
        const difference = [];
        for (const { view } of this.db.items) {
            if (nodes.isHidden(view)) continue;
            if (!nodes.isVisible(view)) continue;
            if (!types.isEnabled(view)) continue;
            difference.push(view);
        }
        return difference;
    }

    get selectableObjects(): visual.Item[] {
        const { nodes } = this;
        return this.visibleObjects.filter(i => nodes.isSelectable(i));
    }

    isHidden(item: visual.Item): boolean { return this.nodes.isHidden(item) }
    makeHidden(item: visual.Item, value: boolean) { return this.nodes.makeHidden(item, value) }
    unhideAll(): Promise<visual.Item[]> { return this.nodes.unhideAll() }
    isVisible(item: visual.Item): boolean { return this.nodes.isVisible(item) }
    makeVisible(item: visual.Item, value: boolean) { return this.nodes.makeVisible(item, value) }
    isSelectable(item: visual.Item): boolean { return this.nodes.isSelectable(item) }
    makeSelectable(item: visual.Item, value: boolean): void { return this.nodes.makeSelectable(item, value) }
    setMaterial(item: visual.Item, id: number): void { return this.nodes.setMaterial(item, id) }
    getMaterial(item: visual.Item): THREE.Material | undefined { return this.nodes.getMaterial(item) }

    saveToMemento(): NodeMemento {
        return this.nodes.saveToMemento();
    }
    restoreFromMemento(m: NodeMemento): void {
        this.nodes.restoreFromMemento(m);
    }
}