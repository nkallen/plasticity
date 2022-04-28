import { Empty } from '../../editor/Empties';
import { Group, GroupId } from '../../editor/Groups';
import { Scene, SceneDisplayInfo } from '../../editor/Scene';
import { assertUnreachable } from '../../util/Util';
import * as visual from '../../visual_model/VisualModel';

type FlatOutlineElement =
    { tag: 'Group'; object: Group; expanded: boolean; indent: number; displayed: boolean } |
    { tag: 'Item'; object: visual.Item; indent: number; displayed: boolean } |
    { tag: 'Empty'; object: Empty; indent: number; displayed: boolean } |
    { tag: 'SolidSection' | 'CurveSection' | 'EmptySection'; indent: number; displayed: boolean, parentId: GroupId };

export function flatten(group: Group, scene: Scene, info: SceneDisplayInfo, expandedGroups: Set<GroupId>, indent = 0): FlatOutlineElement[] {
    let result: FlatOutlineElement[] = [];
    if (expandedGroups.has(group.id)) {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: true, object: group, indent, displayed: info.visibleGroups.has(group.id) });
        const solids: FlatOutlineElement[] = [], curves: FlatOutlineElement[] = [], empties: FlatOutlineElement[] = [];
        for (const child of scene.list(group)) {
            const tag = child.tag;
            switch (tag) {
                case 'Group':
                    result = result.concat(flatten(child.group, scene, info, expandedGroups, indent + 1));
                    break;
                case 'Item':
                    const element = { tag: child.tag, object: child.item, indent, displayed: info.visibleItems.has(child.item) };
                    if (child.item instanceof visual.Solid)
                        solids.push(element);
                    else if (child.item instanceof visual.SpaceInstance)
                        curves.push(element);
                    else
                        throw new Error("invalid item: " + child.item.constructor.name);
                    break;
                case 'Empty': {
                    const element = { tag: child.tag, object: child.empty, indent, displayed: info.visibleItems.has(child.empty) };
                    empties.push(element);
                    break;
                }
                default: assertUnreachable(tag);
            }
        }
        if (solids.length > 0) {
            result.push({ tag: 'SolidSection', indent, displayed: info.visibleGroups.has(group.id), parentId: group.id });
            result = result.concat(solids);
        }
        if (curves.length > 0) {
            result.push({ tag: 'CurveSection', indent, displayed: info.visibleGroups.has(group.id), parentId: group.id });
            result = result.concat(curves);
        }
        if (empties.length > 0) {
            result.push({ tag: 'EmptySection', indent, displayed: info.visibleGroups.has(group.id), parentId: group.id });
            result = result.concat(empties);
        }
    } else {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: false, object: group, indent, displayed: true });
    }
    return result;
}
