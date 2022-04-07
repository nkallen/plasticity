import { CompositeDisposable } from 'event-kit';
import { createRef, RefObject, render } from 'preact';
import { ExportCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, LockSelectedCommand, UnhideAllCommand } from '../../commands/CommandLike';
import { DeleteCommand } from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { flatten, Group, GroupId } from '../../editor/Group';
import { NodeItem, NodeKey } from '../../editor/Nodes';
import OutlinerItems, { indentSize } from './OutlinerItems';
import { SelectionDelta } from '../../selection/ChangeSelectionExecutor';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    OutlinerItems(editor);

    class Outliner extends HTMLElement {
        private readonly disposable = new CompositeDisposable();
        private readonly expandedGroups = new Set<GroupId>([editor.scene.groups.root.id]);
        private map: Map<NodeKey, RefObject<any>> = new Map();

        connectedCallback() {
            this.render();
            const { disposable } = this;

            editor.signals.backupLoaded.add(this.render);
            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.selectionDelta.add(this.updateSelection);
            editor.signals.objectHidden.add(this.updateNodeItem);
            editor.signals.objectUnhidden.add(this.updateNodeItem);
            editor.signals.objectSelectable.add(this.updateNodeItem);
            editor.signals.objectUnselectable.add(this.updateNodeItem);
            editor.signals.groupCreated.add(this.expand);

            for (const Command of [DeleteCommand, LockSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, UnhideAllCommand, ExportCommand]) {
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
            editor.signals.selectionDelta.remove(this.updateSelection);
            editor.signals.objectHidden.remove(this.updateNodeItem);
            editor.signals.objectUnhidden.remove(this.updateNodeItem);
            editor.signals.objectSelectable.remove(this.updateNodeItem);
            editor.signals.objectUnselectable.remove(this.updateNodeItem);
            editor.signals.groupCreated.add(this.remove);
            this.disposable.dispose();
        }

        private updateNodeItem = (item: NodeItem) => {
            this.map.get(editor.scene.nodes.item2key(item))?.current.render();
        }

        private updateSelection = (delta: SelectionDelta) => {
            for (const item of [...delta.added, ...delta.removed]) {
                if (item instanceof visual.Item) {
                    this.updateNodeItem(item);
                }
            }
        }

        render = () => {
            const { scene: { groups, groups: { root }, nodes } } = editor;
            const flattened = flatten(root, groups, this.expandedGroups);
            const map = new Map<NodeKey, RefObject<any>>();
            const result = flattened.map((item) => {
                const ref = createRef();
                switch (item.tag) {
                    case 'Group':
                    case 'Item':
                        const key = nodes.item2key(item.object);
                        map.set(key, ref);
                        return <plasticity-outliner-item key={`${key},${item.indent}`} nodeKey={key} ref={ref} indent={item.indent}></plasticity-outliner-item>
                    case 'SolidSection':
                    case 'CurveSection':
                        const hidden = false;
                        const name = item.tag === 'SolidSection' ? 'Solids' : 'Curves';
                        return <div class="flex gap-3 h-8 p-3 overflow-hidden items-center rounded-md group" style={`margin-left: ${indentSize * item.indent}px`}>
                            <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                            <plasticity-icon name="folder-solids" class="text-neutral-500 group-hover:text-neutral-200"></plasticity-icon>
                            <div class="py-0.5 flex-1">
                                <div class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap">{name}</div>
                            </div>
                            <button class="py-1 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100">
                                <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                            </button>
                        </div>
                }
            });
            this.map = map;
            render(<>
                <div class="px-4 pt-4 pb-3">
                    <h1 class="text-xs font-bold text-neutral-100">Scene</h1>
                </div>
                <div class="pl-3 pr-4">
                    {result}
                </div>
            </>, this);
        }

        private expand = (group: Group) => {
            this.expandedGroups.add(group.id);
            this.render();
        }

        private collapse = (group: Group) => {
            this.expandedGroups.delete(group.id);
            this.render();
        }
    }
    customElements.define('plasticity-outliner', Outliner);
}