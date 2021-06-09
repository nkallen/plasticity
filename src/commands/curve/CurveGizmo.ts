import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";
import c3d from '../../../build/Release/c3d.node';

const map: Record<string, number> = {
    'gizmo:curve:line-segment': c3d.SpaceType.LineSegment3D,
    'gizmo:curve:arc': c3d.SpaceType.Arc3D,
    'gizmo:curve:polyline': c3d.SpaceType.Polyline3D,
    'gizmo:curve:nurbs': c3d.SpaceType.Nurbs3D,
    'gizmo:curve:hermite': c3d.SpaceType.Hermit3D,
    'gizmo:curve:bezier': c3d.SpaceType.Bezier3D,
    'gizmo:curve:cubic-spline': c3d.SpaceType.CubicSpline3D,
    'gizmo:curve:add-curve': -1,
}

const commands = new Array<string>();
for (const key in map) {
    commands.push(key);
}

export type CurveGizmoEvent = { tag: 'type', type: number } | { tag: 'add-curve' }

export class CurveGizmo extends CommandKeyboardInput<(e: CurveGizmoEvent) => void> {
    constructor(editor: EditorLike) {
        super('curve', editor, commands);
    }

    resolve(cb: (e: CurveGizmoEvent) => void, command: string) {
        if (command === 'gizmo:curve:add-curve') {
            cb({ tag: 'add-curve' });
        } else {
            cb({ tag: 'type', type: map[command] });
        }
    }
}