import { CompositeDisposable } from 'event-kit';
import { render } from 'preact';
import * as THREE from 'three';
import { ExportCommand, GroupSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, LockSelectedCommand, UngroupSelectedCommand, UnhideAllCommand } from '../../commands/CommandLike';
import { DeleteCommand, RemoveMaterialCommand, SetMaterialCommand } from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { Empty } from '../../editor/Empties';
import { Group, GroupId, VirtualGroup } from '../../editor/Groups';
import { NodeKey, RealNodeItem } from '../../editor/Nodes';
import { SelectionDelta } from '../../selection/ChangeSelectionExecutor';
import { assertUnreachable } from '../../util/Util';
import * as visual from '../../visual_model/VisualModel';
import { flatten } from "./FlattenOutline";
import OutlinerItem, { indentSize, ToggleVisibilityCommand } from './OutlinerItems';

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
            editor.signals.selectionDelta.add(this.onSelectionDelta);
            editor.signals.commandEnded.add(this.render);
            editor.signals.historyChanged.add(this.render);

            const Commands = [DeleteCommand, LockSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, UnhideAllCommand, ExportCommand, GroupSelectedCommand, UngroupSelectedCommand, SetMaterialCommand, RemoveMaterialCommand];
            for (const Command of Commands) {
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
            editor.signals.commandEnded.remove(this.render);
            editor.signals.selectionDelta.remove(this.onSelectionDelta);
            this.disposable.dispose();
        }

        private onSelectionDelta = (delta: SelectionDelta) => {
            const { scene } = editor;
            for (const item of delta.added) {
                if (!(item instanceof Group || item instanceof visual.Item)) continue;
                let parent = scene.parent(item);
                if (parent === undefined) return;
                while (!parent.isRoot) {
                    this.expandedGroups.add(parent.id);
                    parent = scene.parent(parent)!;
                }
            }
        }

        static klass(nodeKey: NodeKey): string {
            const item = editor.scene.key2item(nodeKey);
            if (item instanceof visual.Solid) return "Solid";
            else if (item instanceof visual.SpaceInstance) return "Curve";
            else if (item instanceof Group) return "Group";
            else if (item instanceof Empty) return "Empty";
            throw new Error("Should be unreachable");
        }

        render = () => {
            const { scene, scene: { root }, selection: { selected } } = editor;
            const flattened = flatten(root, scene, scene.visibility, this.expandedGroups);

            const firstSelected = new Set<number>(), lastSelected = new Set<number>();
            FindContiguousBlocksOfSelectedItems: {
                let prevSelected = false;
                for (const [i, item] of flattened.entries()) {
                    let isSelected = false;
                    const tag = item.tag;
                    switch (tag) {
                        case 'Group':
                        case 'Item':
                        case 'Empty':
                            const object = item.object;
                            isSelected = selected.has(object);
                            break;
                        case 'CurveSection':
                        case 'SolidSection':
                        case 'EmptySection':
                            isSelected = false;
                            break;
                        default: assertUnreachable(tag);
                    }
                    if (!prevSelected && isSelected) firstSelected.add(i);
                    if (i > 0 && prevSelected && !isSelected) lastSelected.add(i - 1);
                    prevSelected = isSelected;
                }
                if (prevSelected) lastSelected.add(flattened.length - 1);
            }

            const result = flattened.map((item, i) => {
                const { indent, displayed: isDisplayed, tag } = item;
                switch (tag) {
                    case 'Group':
                    case 'Empty':
                    case 'Item':
                        const object = item.object;
                        const visible = scene.isVisible(object);
                        const hidden = scene.isHidden(object);
                        const selectable = scene.isSelectable(object);
                        const isSelected = selected.has(object);
                        const nodeKey = scene.item2key(item.object);
                        const klass = Outliner.klass(nodeKey);
                        const mat = scene.getMaterial(object);
                        const color = getColor(mat);
                        const id = object instanceof Group || object instanceof Empty ? object.simpleName : editor.db.lookupId(object.simpleName);
                        const name = scene.getName(object) ?? `${klass} ${id}`;
                        return <plasticity-outliner-item
                            class={`block ${firstSelected.has(i) ? 'rounded-t' : ''}  ${lastSelected.has(i) ? 'rounded-b' : ''} overflow-clip`}
                            key={nodeKey} nodeKey={nodeKey} klass={klass} name={name} indent={indent} isvisible={visible} ishidden={hidden} selectable={selectable} isdisplayed={isDisplayed} isSelected={isSelected} onexpand={this.expand} color={color}
                        ></plasticity-outliner-item>
                    case 'SolidSection':
                    case 'CurveSection':
                    case 'EmptySection': {
                        const group = scene.lookupGroupById(item.parentId);
                        let name: string;
                        let virtual: VirtualGroup;
                        switch (tag) {
                            case 'CurveSection': name = 'Curves'; virtual = group.curves; break;
                            case 'SolidSection': name = 'Solids'; virtual = group.solids; break;
                            case 'EmptySection': name = 'Empties'; virtual = group.empties; break;
                            default: assertUnreachable(tag);
                        }
                        const visible = scene.isVisible(virtual);
                        const isDisplayed = item.displayed;
                        return <div class={`${isDisplayed ? '' : 'opacity-50'} flex gap-1 pl-1 pr-3 overflow-hidden items-center rounded-md group`} style={`padding-left: ${4 + indentSize * indent}px`}>
                            <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon>
                            <plasticity-icon name="folder-solids" class="text-neutral-500 group-hover:text-neutral-200"></plasticity-icon>
                            <div class="py-0.5 flex-1">
                                <div class="w-full text-neutral-300 text-xs group-hover:text-neutral-100 h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap">{name}</div>
                            </div>
                            <button
                                class="py-0.5 rounded group text-neutral-300 group-hover:visible invisible hover:text-neutral-100"
                                onClick={e => this.setVisibility(e, virtual, !visible)}
                            >
                                <plasticity-tooltip placement="top">Disable in viewport</plasticity-tooltip>
                                <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                            </button>
                        </div>
                    }
                }
            });
            render(<>
                <div class="flex justify-between pl-4 pt-4 pb-3 pr-5">
                    <h1 class="text-xs font-bold text-neutral-100">Scene</h1>
                    <button
                        class="py-0.5 rounded group text-neutral-300 hover:text-neutral-100"
                        onClick={this.createGroup}
                    >
                        <plasticity-icon name='add-circled-outline'></plasticity-icon>
                        <plasticity-tooltip placement="top" command="command:group-selected">Create group (of selected items)</plasticity-tooltip>
                    </button>
                </div>
                <div class="pl-3 pr-3">
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

        setVisibility = async (e: MouseEvent, virtual: VirtualGroup, value: boolean) => {
            const command = new ToggleVisibilityCommand(editor, virtual, value);
            editor.enqueue(command);
            e.stopPropagation();
        }

        createGroup = (e: MouseEvent) => {
            const command = new GroupSelectedCommand(editor);
            editor.enqueue(command);
        }
    }
    customElements.define('plasticity-outliner', Outliner);
}

function getColor(material: THREE.Material | undefined): string | undefined {
    if (material instanceof THREE.MeshStandardMaterial) return material.color.getHexString();
    if (material instanceof THREE.MeshBasicMaterial) return material.color.getHexString();
    if (material instanceof THREE.MeshLambertMaterial) return material.color.getHexString();
    return undefined;
}