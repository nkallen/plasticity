import { Group, GroupId } from '../../editor/Groups';
import { Scene, SceneDisplayInfo } from '../../editor/Scene';
import * as visual from '../../visual_model/VisualModel';

type FlatOutlineElement =
    { tag: 'Group'; object: Group; expanded: boolean; indent: number; displayed: boolean } |
    { tag: 'Item'; object: visual.Item; indent: number; displayed: boolean } |
    { tag: 'SolidSection'; indent: number; displayed: boolean } |
    { tag: 'CurveSection'; indent: number; displayed: boolean };

export function flatten(group: Group, scene: Scene, info: SceneDisplayInfo, expandedGroups: Set<GroupId>, indent = 0): FlatOutlineElement[] {
    let result: FlatOutlineElement[] = [];
    if (expandedGroups.has(group.id)) {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: true, object: group, indent, displayed: info.visibleGroups.has(group.id) });
        const solids: FlatOutlineElement[] = [], curves: FlatOutlineElement[] = [];
        for (const child of scene.list(group)) {
            switch (child.tag) {
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
            }
        }
        if (solids.length > 0) {
            result.push({ tag: 'SolidSection', indent, displayed: info.visibleGroups.has(group.id) });
            result = result.concat(solids);
        }
        if (curves.length > 0) {
            result.push({ tag: 'CurveSection', indent, displayed: info.visibleGroups.has(group.id) });
            result = result.concat(curves);
        }
    } else {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: false, object: group, indent, displayed: true });
    }
    return result;
}
