import { AbstractCommandKeyboardInput, CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";
import c3d from '../../../build/Release/c3d.node';

const commands = new Array<string>();
const map: Record<string, number> = {
    // 'gizmo:curve:line-segment': c3d.SpaceType.LineSegment3D,
    // 'gizmo:curve:polyline': c3d.SpaceType.Polyline3D,
    'gizmo:curve:hermite': c3d.SpaceType.Hermit3D,
    'gizmo:curve:bezier': c3d.SpaceType.Bezier3D,
    'gizmo:curve:nurbs': c3d.SpaceType.Nurbs3D,
    'gizmo:curve:cubic-spline': c3d.SpaceType.CubicSpline3D,
    // 'gizmo:curve:arc': c3d.SpaceType.Arc3D,
}
for (const key in map) commands.push(key);
commands.push('gizmo:curve:undo');

export type CurveKeyboardEvent = { tag: 'type', type: number } | { tag: 'undo' }

export class CurveKeyboardGizmo extends AbstractCommandKeyboardInput<(e: CurveKeyboardEvent) => void> {
    constructor(editor: EditorLike) {
        super('curve', editor, commands);
    }

    resolve(cb: (e: CurveKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:curve:undo':
                cb({ tag: 'undo' });
                break;
            default:
                cb({ tag: 'type', type: map[command] });
        }
    }
}

export type LineKeyboardEvent = { tag: 'undo' };
export class LineKeyboardGizmo extends AbstractCommandKeyboardInput<(e: LineKeyboardEvent) => void> {
    constructor(editor: EditorLike) {
        super('line', editor, ['gizmo:line:undo']);
    }

    resolve(cb: (e: LineKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:line:undo':
                cb({ tag: 'undo' });
                break;
        }
    }
}