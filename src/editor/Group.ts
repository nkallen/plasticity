import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { GeometryDatabase } from './GeometryDatabase';
import { NodeKey, Nodes, Node } from './Nodes';

export type GroupId = number;

export class Groups {
    private counter = 0;

    private readonly member2parent = new Map<NodeKey, GroupId>();
    private readonly group2children = new Map<GroupId, Set<NodeKey>>();
    private readonly group2name = new Map<GroupId, string>();
    readonly root: GroupId;
    cwd: GroupId;

    constructor(private readonly db: GeometryDatabase, private readonly signals: EditorSignals) {
        this.root = this.create("/", 0); // the root is its own parent
        this.cwd = this.root;
        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.addItem(this.item2id(item));
        });
        signals.objectRemoved.add(([item, agent, mode]) => {
            if (agent === 'user' && mode === 'delete') this.deleteItem(this.item2id(item));
        });
    }

    setName(groupId: GroupId, name: string){
        this.group2name.set(groupId, name);
    }

    create(name: string, parent = this.root): GroupId {
        const id = this.counter;
        this.group2name.set(id, name);
        this.group2children.set(id, new Set());
        this.member2parent.set(Nodes.groupKey(id), parent);
        this.counter++;
        return id;
    }

    delete(groupId: GroupId) {
        if (groupId === this.root) throw new Error("Cannot delete root");
        const children = this.group2children.get(groupId)!;
        for (const child of children) {
            this._moveItemToGroup(child, this.root);
        }
        this.group2children.delete(groupId);
        const k = Nodes.groupKey(groupId);
        const parent = this.member2parent.get(k)!;
        this.group2children.get(parent)!.delete(k);
        this.group2name.delete(groupId);
    }

    moveItemToGroup(item: visual.Item, into: GroupId) {
        this._moveItemToGroup(Nodes.itemKey(this.item2id(item)), into);
    }

    private _moveItemToGroup(key: NodeKey, into: GroupId) {
        this.deleteMembership(key);
        this.addMembership(key, into);
    }

    list(groupId: GroupId): Node[] {
        const { group2children } = this;
        const memberKeys = group2children.get(groupId)!;
        return [...memberKeys].map(Nodes.dekey);
    }

    private addItem(id: c3d.SimpleName, into = this.cwd) {
        const k = Nodes.itemKey(id);
        this.addMembership(k, into);
    }

    private deleteItem(id: c3d.SimpleName) {
        const k = Nodes.itemKey(id);
        this.deleteMembership(k);
    }

    private addMembership(key: NodeKey, into = this.cwd) {
        const { group2children, member2parent } = this;
        group2children.get(into)!.add(key);
        member2parent.set(key, into);
    }

    private deleteMembership(key: NodeKey) {
        const { group2children, member2parent } = this;
        const groupId = member2parent.get(key)!;
        member2parent.delete(key);
        group2children.get(groupId)!.delete(key);
    }

    private item2id(item: visual.Item): c3d.SimpleName {
        const { db } = this;
        const version = item.simpleName;
        return db.lookupId(version)!;
    }
}
