import { CompositeDisposable, Disposable } from 'event-kit';
import c3d from '../../../build/Release/c3d.node';
import { SelectionDatabase } from '../../selection/SelectionDatabase';
import { assertUnreachable } from '../../util/Util';
import * as visual from '../../visual_model/VisualModel';
import { DatabaseLike } from "../DatabaseLike";
import { EditorSignals } from '../EditorSignals';

type GroupNode = Group | visual.Item;
type GroupNodeId = { tag: 'group', id: number } | { tag: 'item', id: c3d.SimpleName }

export class Group {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    parent!: Group;

    constructor(
        public readonly id: number,
        public name: string,
        private readonly selection: SelectionDatabase,
        private readonly signals: EditorSignals
    ) {
        const b = signals.objectRemoved.add(([item, _, __]) => this.remove(item));
        this.disposable.add(new Disposable(() => {
            b.detach();
        }));
    }

    private readonly _nodes: Map<GroupNodeId, string> = new Map();
    get nodes(): IterableIterator<GroupNodeId> { return this._nodes.keys() }

    add(node: GroupNode, name: string) {
        // FIXME: need version
        this._nodes.set(node2id(node), name);
    }

    remove(node: GroupNode) {
        this._nodes.delete(node2id(node));
    }

    move(node: GroupNode, group: Group) {

    }
}

function node2id(node: GroupNode): GroupNodeId {
    if (node instanceof Group) {
        return { tag: 'group', id: node.id }
    } else if (node instanceof visual.Item) {
        return { tag: 'item', id: node.simpleName }
    } else assertUnreachable(node);
}

export class GroupManager {
    readonly root = new Group(0, "/", this.selection, this.signals);
    private counter = 0;
    get version() { return this.counter }
    private readonly id2group = new Map<number, Group>();

    constructor(private readonly db: DatabaseLike, private readonly selection: SelectionDatabase, private readonly signals: EditorSignals) {
        this.root.parent = this.root;
        // TODO: object added adds to root
    }

    create(): Group {
        const id = this.counter++;
        const group = new Group(id, `Group ${id}`, this.selection.makeTemporary(), this.signals);
        this.id2group.set(id, group);
        return group;
    }

    delete(group: Group) {
        this.id2group.delete(group.id);
    }
}