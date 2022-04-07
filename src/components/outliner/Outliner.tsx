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
            const hidden = true, visible = true, selectable = true;
            const result = <>
                <div class="px-4 pt-4 pb-3">
                    <h1 class="text-xs font-bold text-neutral-100">Scene</h1>
                </div>
                <div class="px-4">
                    <div class="flex h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="nav-arrow-right" class="text-neutral-500"></plasticity-icon>
                        <plasticity-icon name="folder" class="text-neutral-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Collapsed group" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                        <plasticity-icon name="folder" class="text-neutral-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Outer group" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-3 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="nav-arrow-right" class="text-neutral-500"></plasticity-icon>
                        <plasticity-icon name="folder" class="text-neutral-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Inner group with extremely long name" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                        <button class="p-1 rounded group text-neutral-300 group-hover:block hidden">
                            <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                        </button>
                        <button class="p-1 rounded group text-neutral-300 group-hover:block hidden">
                            <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                        </button>
                        <button class="p-1 rounded group text-neutral-300 group-hover:block hidden">
                            <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                        </button>
                    </div>
                    <div class="ml-3 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                        <plasticity-icon name="folder-solids" class="text-neutral-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Solids" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md bg-accent-600 hover:bg-accent-500 group">
                        <plasticity-icon name="solid" class="text-accent-100 hover:text-accent-50"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="select-text w-full text-neutral-900 text-xs h-6 p-0.5 rounded overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='Solid' value="Cylinder.003" autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="solid" class="text-accent-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Sphere.001" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md bg-accent-600 hover:bg-accent-500 group">
                        <plasticity-icon name="solid" class="text-accent-100 hover:text-accent-50"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-accent-100 hover:text-accent-50 text-xs h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Cylinder.002" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="solid" class="text-accent-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-200 group-hover:text-neutral-100 text-xs h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Cylinder.002" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-3 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                        <plasticity-icon name="folder-curves" class="text-neutral-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Curves" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="curve" class="text-accent-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Circle.002" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                    </div>
                    <div class="ml-9 flex gap-2 h-8 p-3 overflow-hidden items-center rounded-md hover:bg-neutral-600 group">
                        <plasticity-icon name="curve" class="text-accent-500"></plasticity-icon>
                        <div class="p-0.5 flex-1">
                            <input type="text" class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap" placeholder='' value="Rectangle.002" disabled autoComplete='no' autocorrect='off' spellCheck={false}></input>
                        </div>
                        <button class="p-1 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100">
                            <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                        </button>
                        <button class="p-1 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100">
                            <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                        </button>
                        <button class="p-1 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100">
                            <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                        </button>
                    </div>
                </div>
            </>;
            render(result, this);
        }

        render2 = () => {
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