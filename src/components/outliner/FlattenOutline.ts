import * as visual from '../../visual_model/VisualModel';
import { Group, Groups, GroupId } from '../../editor/Group';

type FlatOutlineElement = { tag: 'Group'; object: Group; expanded: boolean; indent: number; } | { tag: 'Item'; object: visual.Item; indent: number; } | { tag: 'SolidSection'; indent: number; } | { tag: 'CurveSection'; indent: number; };

export function flatten(group: Group, groups: Groups, expandedGroups: Set<GroupId>, indent = 0): FlatOutlineElement[] {
    let result: FlatOutlineElement[] = [];
    // FIXME: this || true is temporary while deciding how this should work
    if (expandedGroups.has(group.id) || true) {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: true, object: group, indent });
        const solids: FlatOutlineElement[] = [], curves: FlatOutlineElement[] = [];
        for (const child of groups.list(group)) {
            switch (child.tag) {
                case 'Group':
                    result = result.concat(flatten(child.group, groups, expandedGroups, indent + 1));
                    break;
                case 'Item':
                    if (child.item instanceof visual.Solid)
                        solids.push({ tag: child.tag, object: child.item, indent });
                    else if (child.item instanceof visual.SpaceInstance)
                        curves.push({ tag: child.tag, object: child.item, indent });
                    else
                        throw new Error("invalid item: " + child.item.constructor.name);
            }
        }
        if (solids.length > 0) {
            result.push({ tag: 'SolidSection', indent });
            result = result.concat(solids);
        }
        if (curves.length > 0) {
            result.push({ tag: 'CurveSection', indent });
            result = result.concat(curves);
        }
    } else {
        if (!group.isRoot)
            result.push({ tag: 'Group', expanded: false, object: group, indent });
    }
    return result;
}
