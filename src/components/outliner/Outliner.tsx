import { CompositeDisposable } from 'event-kit';
import { createRef, RefObject, render } from 'preact';
import { ExportCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, LockSelectedCommand, UnhideAllCommand } from '../../commands/CommandLike';
import { DeleteCommand } from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { flatten, Group, GroupId } from '../../editor/Group';
import { NodeItem, NodeKey } from '../../editor/Nodes';
import OutlinerItems from './OutlinerItems';
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
                let row;
                switch (item.tag) {
                    case 'Group':
                        const key = nodes.item2key(item.group);
                        map.set(key, ref);
                        row = <plasticity-outliner-item
                            key={key}
                            nodeKey={key}
                            expanded={item.expanded} group={item.group}
                            ref={ref}
                            onClick={() => item.expanded ? this.collapse(item.group) : this.expand(item.group)}
                        ></plasticity-outliner-item>
                        break;
                    case 'Item': {
                        const key = nodes.item2key(item.item);
                        map.set(key, ref);
                        row = <plasticity-outliner-item
                            key={key}
                            nodeKey={key}
                            ref={ref}
                            item={item.item}
                            indent={item.indent}>
                        </plasticity-outliner-item>
                        break;
                    }
                    case 'SolidSection':
                        row = <h2 class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700">Solids</h2>
                        break;
                    case 'CurveSection':
                        row = <h2 class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700">Curves</h2>
                        break;
                }
                return <li class={`pl-${item.indent}`}>{row}</li>
            });
            this.map = map
            render(<ol class="py-3 px-4">{result}</ol>, this);
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