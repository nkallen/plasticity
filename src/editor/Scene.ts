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
        const acc = this.computeVisibleObjectsInGroup(this.root, [], false);
        return acc.concat(this.db.findAutomatics());
    }

    private computeVisibleObjectsInGroup(start: Group, acc: visual.Item[], checkSelectable: boolean): visual.Item[] {
        const { nodes, types } = this;
        this.list(start);
        for (const listing of this.list(start)) {
            switch (listing.tag) {
                case 'Group':
                    const group = listing.group;
                    if (nodes.isHidden(group)) continue;
                    if (!nodes.isVisible(group)) continue;
                    if (checkSelectable && !nodes.isSelectable(group)) continue;
                    this.computeVisibleObjectsInGroup(group, acc, checkSelectable);
                    break;
                case 'Item':
                    const view = listing.item;
                    if (nodes.isHidden(view)) continue;
                    if (!nodes.isVisible(view)) continue;
                    if (!types.isEnabled(view)) continue;
                    if (checkSelectable && !nodes.isSelectable(view)) continue;
                    acc.push(view);
                    break;
            }
        }
        return acc;
    }

    private rebuild() { }

    get selectableObjects(): visual.Item[] {
        return this.computeVisibleObjectsInGroup(this.root, [], true);
    }

    makeHidden(node: NodeItem, value: boolean) { this.nodes.makeHidden(node, value); this.rebuild() }
    unhideAll(): Promise<NodeItem[]> { const result = this.nodes.unhideAll(); this.rebuild(); return result }
    makeVisible(node: NodeItem, value: boolean) { this.nodes.makeVisible(node, value); this.rebuild() }
    makeSelectable(node: NodeItem, value: boolean): void { this.nodes.makeSelectable(node, value); this.rebuild() }
    deleteGroup(group: Group) { this.groups.delete(group); this.rebuild() }
    moveToGroup(node: NodeItem, group: Group) { this.groups.moveNodeToGroup(node, group); this.rebuild() }
    setMaterial(node: NodeItem, id: number): void { this.nodes.setMaterial(node, id); this.rebuild() }
    createGroup() { const result = this.groups.create(); this.rebuild(); return result; }

    get root() { return this.groups.root }
    isHidden(node: NodeItem): boolean { return this.nodes.isHidden(node) }
    isVisible(node: NodeItem): boolean { return this.nodes.isVisible(node) }
    isSelectable(node: NodeItem): boolean { return this.nodes.isSelectable(node) }
    getMaterial(node: NodeItem): THREE.Material | undefined { return this.nodes.getMaterial(node) }
    getName(node: NodeItem): string | undefined { return this.nodes.getName(node) }
    setName(node: NodeItem, name: string) { this.nodes.setName(node, name) }
    key2item(key: NodeKey) { return this.nodes.key2item(key) }
    item2key(item: NodeItem) { return this.nodes.item2key(item) }
    list(group: Group) { return this.groups.list(group) }

    saveToMemento(): SceneMemento {
        return new SceneMemento(this.nodes.saveToMemento(), this.groups.saveToMemento());
    }

    restoreFromMemento(m: SceneMemento): void {
        this.nodes.restoreFromMemento(m.nodes);
        this.groups.restoreFromMemento(m.groups);
    }
}