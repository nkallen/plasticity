import c3d from '../../build/Release/c3d.node';
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';
import { GeometryDatabase } from './GeometryDatabase';
import { GroupMemento, MementoOriginator } from './History';
import { NodeItem, NodeKey, Nodes, RealNodeItem } from './Nodes';

export type GroupId = number;
export type GroupListing = { tag: 'Group', group: Group } | { tag: 'Item', item: visual.Item }
export type VirtualGroupType = 'Curves' | 'Solids';

export class Groups implements MementoOriginator<GroupMemento> {
    private counter = 0;

    private readonly member2parent = new Map<NodeKey, GroupId>();
    private readonly group2children = new Map<GroupId, Set<NodeKey>>();
    readonly root: Group; // always 0
    cwd: Group;

    constructor(private readonly db: GeometryDatabase, private readonly signals: EditorSignals) {
        this.root = this.create(); // the root is its own parent
        this.cwd = this.root;
        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.addItem(this.item2id(item));
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.deleteItem(this.item2id(item));
        });
    }

    get all() {
        return [...this.group2children.keys()];
    }

    create(parent = this.root): Group {
        const id = this.counter;
        this.group2children.set(id, new Set());
        const parentId = parent !== undefined ? parent.id : 0;
        this.member2parent.set(Nodes.groupKey(id), parentId);
        if (id !== parentId) this.group2children.get(parentId)!.add(Nodes.groupKey(id));
        this.counter++;
        const group = new Group(id);
        this.signals.groupCreated.dispatch(group);
        return group;
    }

    delete(group: Group) {
        const groupId = group.id;
        if (group === this.root) throw new Error("Cannot delete root");
        const children = this.group2children.get(groupId)! as ReadonlySet<NodeKey>;
        for (const child of children) {
            this._moveItemToGroup(child, this.root);
        }
        this.group2children.delete(groupId);
        const k = Nodes.groupKey(groupId);
        const parent = this.member2parent.get(k)!;
        this.group2children.get(parent)!.delete(k);
        this.member2parent.delete(k)!;
        this.signals.groupDeleted.dispatch(group);
    }

    moveNodeToGroup(item: RealNodeItem, into: Group) {
        const key = this.keyForItem(item);
        this._moveItemToGroup(key, into);
        this.signals.groupChanged.dispatch(into);
    }

    groupForNode(item: RealNodeItem): Group | undefined {
        const key = this.keyForItem(item);
        const id = this.member2parent.get(key);
        if (id === undefined) return;
        return new Group(id);
    }

    // NOTE: most visual.Item belong to a group. The exception being "automatics",
    // like automatically generated regions.
    parent(item: NodeItem): Group | undefined {
        if (item instanceof VirtualGroup) {
            return item.parent;
        } else {
            const key = this.keyForItem(item);
            const parentId = this.member2parent.get(key);
            if (parentId === undefined) return undefined;
            return new Group(parentId);
        }
    }

    private _moveItemToGroup(key: NodeKey, into: Group) {
        this.deleteMembership(key);
        this.addMembership(key, into);
    }

    list(group: Group): GroupListing[] {
        const { group2children, db } = this;
        const memberKeys = group2children.get(group.id) as ReadonlySet<NodeKey>;
        if (memberKeys === undefined) throw new Error(`Group ${group.id} has no child set`);
        const result = [];
        for (const key of memberKeys) {
            const { tag, id } = Nodes.dekey(key);
            switch (tag) {
                case 'Group':
                    result.push({ tag, group: new Group(id) });
                    break;
                case 'Item':
                    result.push({ tag, item: db.lookupById(id).view })
            }
        }
        return result;
    }

    walk(group: Group): GroupListing[] {
        const result: GroupListing[] = [];
        let work = this.list(group);
        while (work.length > 0) {
            const child = work.pop()!;
            result.push(child);
            switch (child.tag) {
                case 'Group':
                    work = work.concat(this.list(child.group));
                    break;
            }
        }
        return result;
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
        group2children.get(into.id)!.add(key);
        member2parent.set(key, into.id);
        this.signals.groupChanged.dispatch(into);
    }

    private deleteMembership(key: NodeKey) {
        const { group2children, member2parent } = this;
        const groupId = member2parent.get(key)!;
        member2parent.delete(key);
        group2children.get(groupId)!.delete(key);
        this.signals.groupChanged.dispatch(new Group(groupId));
    }

    private item2id(item: visual.Item): c3d.SimpleName {
        const { db } = this;
        const version = item.simpleName;
        return db.lookupId(version)!;
    }

    private keyForItem(item: RealNodeItem) {
        return item instanceof visual.Item ? Nodes.itemKey(this.item2id(item)) : Nodes.groupKey(item.id);
    }

    saveToMemento(): GroupMemento {
        return new GroupMemento(
            this.counter,
            this.cwd.id,
            new Map(this.member2parent),
            copyGroup2Children(this.group2children),
        )
    }
    restoreFromMemento(m: GroupMemento) {
        (this.counter as Groups['counter']) = m.counter;
        (this.cwd as Groups['cwd']) = new Group(m.cwd);
        (this.member2parent as Groups['member2parent']) = new Map(m.member2parent);
        (this.group2children as Groups['group2children']) = copyGroup2Children(m.group2children);
    }

    validate() {
        for (const [key, parent] of this.member2parent) {
            if (key === "Group,0") continue;
            console.assert(this.group2children.get(parent)!.has(key), `${key} has parent ${parent} but parent has no child ${key} (${[...this.group2children.get(parent)!]})`);
        }
    }

    debug() {
        console.group("Groups");
        const { member2parent, group2children, counter } = this;
        console.info("counter", counter)
        console.group("member2parent");
        console.table([...member2parent].map(([member, parent]) => ({ member, parent })));
        console.groupEnd();
        console.group("group2children");
        console.table([...group2children].map(([group, children]) => ({ group, children: [...children].join(',') })));
        console.groupEnd();
        console.groupEnd();
    }
}

function copyGroup2Children(group2children: ReadonlyMap<GroupId, ReadonlySet<NodeKey>>) {
    const group2childrenCopy = new Map<GroupId, Set<NodeKey>>();
    for (const [key, value] of group2children) {
        group2childrenCopy.set(key, new Set(value));
    }
    return group2childrenCopy;
}

export class Group {
    readonly curves = new VirtualGroup(this, 'Curves');
    readonly solids = new VirtualGroup(this, 'Solids');

    constructor(readonly id: GroupId) {
        if (!Number.isSafeInteger(id)) throw new Error("invalid GroupId: " + id);
    }
    get simpleName() { return this.id }
    get isRoot() { return this.id === 0 }
}

export class VirtualGroup {
    constructor(readonly parent: Group, readonly type: VirtualGroupType) { }
}