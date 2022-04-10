import { CompositeDisposable } from 'event-kit';
import { render } from 'preact';
import { ExportCommand, GroupSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, LockSelectedCommand, UngroupSelectedCommand, UnhideAllCommand } from '../../commands/CommandLike';
import { DeleteCommand } from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { Group, GroupId, VirtualGroup } from '../../editor/Groups';
import { NodeItem, NodeKey, RealNodeItem } from '../../editor/Nodes';
import { SelectionDelta } from '../../selection/ChangeSelectionExecutor';
import * as visual from '../../visual_model/VisualModel';
import { flatten } from "./FlattenOutline";
import OutlinerItem, { indentSize } from './OutlinerItems';

export default (editor: Editor) => {
    OutlinerItem(editor);

    class Outliner extends HTMLElement {
        private readonly disposable = new CompositeDisposable();
        private readonly expandedGroups = new Set<GroupId>([editor.scene.root.id]);

        connectedCallback() {
            this.render();
            const { disposable } = this;

            editor.signals.backupLoaded.add(this.render);
            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.historyChanged.add(this.render);
            editor.signals.selectionDelta.add(this.onSelectionDelta);

            for (const Command of [DeleteCommand, LockSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, UnhideAllCommand, ExportCommand, GroupSelectedCommand, UngroupSelectedCommand]) {
                disposable.add(editor.registry.addOne(this, `command:${Command.identifier}`, () => {
                    const command = new Command(editor);
                    command.agent = 'user';
                    editor.enqueue(command)
                }));
            }
        }

        disconnectedCallback() {
            editor.signals.backupLoaded.remove(this.render);
            editor.signals.sceneGraphChanged.remove(this.render);
            editor.signals.historyChanged.remove(this.render);
            editor.signals.selectionDelta.remove(this.onSelectionDelta);
            this.disposable.dispose();
        }

        private onSelectionDelta = (delta: SelectionDelta) => {
            const { scene } = editor;
            for (const item of delta.added) {
                if (!(item instanceof Group || item instanceof visual.Item)) continue;
                let parent = scene.parent(item);
                while (!parent.isRoot) {
                    this.expandedGroups.add(parent.id);
                    parent = scene.parent(parent);
                }
            }
            this.render();
        }

        static klass(nodeKey: NodeKey): string {
            const item = editor.scene.key2item(nodeKey);
            if (item instanceof visual.Solid) return "Solid";
            else if (item instanceof visual.SpaceInstance) return "Curve";
            else if (item instanceof Group) return "Group";
            throw new Error("Should be unreachable");
        }

        render = () => {
            const { scene, scene: { root }, selection: { selected } } = editor;
            const flattened = flatten(root, scene, scene.visibility, this.expandedGroups);
            const result = flattened.map((item) => {
                const { indent, displayed: isDisplayed } = item;
                switch (item.tag) {
                    case 'Group':
                    case 'Item':
                        const object = item.object;
                        const visible = scene.isVisible(object);
                        const hidden = scene.isHidden(object);
                        const selectable = scene.isSelectable(object);
                        const isSelected = selected.has(object);
                        const nodeKey = scene.item2key(item.object);
                        const klass = Outliner.klass(nodeKey);
                        const name = scene.getName(object) ?? `${klass} ${item instanceof Group ? item.id : editor.db.lookupId(object.simpleName)}`;
                        return <plasticity-outliner-item key={nodeKey} nodeKey={nodeKey} klass={klass} name={name} indent={item.indent} isvisible={visible} ishidden={hidden} selectable={selectable} isdisplayed={isDisplayed} isSelected={isSelected} onexpand={this.expand}></plasticity-outliner-item>
                    case 'SolidSection':
                    case 'CurveSection': {
                        const name = item.tag === 'SolidSection' ? 'Solids' : 'Curves';
                        const virtual = new VirtualGroup(new Group(item.parentId), item.tag === 'CurveSection' ? 'Curves' : 'Solids');
                        const visible = scene.isVisible(virtual);
                        const isDisplayed = visible;
                        return <div class={`${isDisplayed ? '' : 'opacity-50'} flex gap-1 h-8 pr-3 py-2 overflow-hidden items-center rounded-md group`} style={`margin-left: ${indentSize * indent}px`}>
                            <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                            <plasticity-icon name="folder-solids" class="text-neutral-500 group-hover:text-neutral-200"></plasticity-icon>
                            <div class="py-0.5 flex-1">
                                <div class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap">{name}</div>
                            </div>
                            <button
                                class="py-0.5 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100"
                                onClick={e => this.makeVisible(e, virtual, !visible)}
                            >
                                <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                            </button>
                        </div>
                    }
                }
            });
            render(<>
                <div class="px-4 pt-4 pb-3">
                    <h1 class="text-xs font-bold text-neutral-100">Scene</h1>
                </div>
                <div class="pl-3 pr-4">
                    {result}
                </div>
            </>, this);
        }

        expand = (e: CustomEvent) => {
            const target = e.target as EventTarget & { item: RealNodeItem };
            const group = target.item;
            if (this.expandedGroups.has(group.id)) this.expandedGroups.delete(group.id);
            else this.expandedGroups.add(group.id);
            this.render();
        }

        makeVisible = (e: MouseEvent, virtual: VirtualGroup, value: boolean) => {
            editor.scene.makeVisible(virtual, value);
            if (value) editor.signals.typeEnabled.dispatch();
            else editor.signals.typeDisabled.dispatch();
        }
    }
    customElements.define('plasticity-outliner', Outliner);
}