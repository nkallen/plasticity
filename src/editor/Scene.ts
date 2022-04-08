import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { Group, Groups } from './Group';
import { MementoOriginator, SceneMemento } from './History';
import MaterialDatabase from "./MaterialDatabase";
import { NodeItem, NodeKey, Nodes } from "./Nodes";
import { TypeManager } from "./TypeManager";

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

    isHidden(node: NodeItem): boolean { return this.nodes.isHidden(node) }
    makeHidden(node: NodeItem, value: boolean) { return this.nodes.makeHidden(node, value) }
    unhideAll(): Promise<NodeItem[]> { return this.nodes.unhideAll() }
    isVisible(node: NodeItem): boolean { return this.nodes.isVisible(node) }
    makeVisible(node: NodeItem, value: boolean) { return this.nodes.makeVisible(node, value) }
    isSelectable(node: NodeItem): boolean { return this.nodes.isSelectable(node) }
    makeSelectable(node: NodeItem, value: boolean): void { return this.nodes.makeSelectable(node, value) }
    setMaterial(node: NodeItem, id: number): void { return this.nodes.setMaterial(node, id) }
    getMaterial(node: NodeItem): THREE.Material | undefined { return this.nodes.getMaterial(node) }
    getName(node: NodeItem): string | undefined { return this.nodes.getName(node) }
    setName(node: NodeItem, name: string) { this.nodes.setName(node, name) }
    createGroup() { return this.groups.create() }
    deleteGroup(group: Group) { return this.groups.delete(group) }
    moveToGroup(node: NodeItem, group: Group) { this.groups.moveNodeToGroup(node, group) }
    key2item(key: NodeKey) { return this.nodes.key2item(key) }
    item2key(item: NodeItem) { return this.nodes.item2key(item) }
    get root() { return this.groups.root }
    list(group: Group) { return this.groups.list(group) }

    saveToMemento(): SceneMemento {
        return new SceneMemento(this.nodes.saveToMemento(), this.groups.saveToMemento());
    }

    restoreFromMemento(m: SceneMemento): void {
        this.nodes.restoreFromMemento(m.nodes);
        this.groups.restoreFromMemento(m.groups);
    }
}