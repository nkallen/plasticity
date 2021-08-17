import c3d from '../../../build/Release/c3d.node';
import { CancellablePromise } from "../../util/Cancellable";
import { AbstractCommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

const commands = new Array<string>();
const map: Record<string, number> = {
    'gizmo:extrude:union': c3d.OperationType.Union,
    'gizmo:extrude:difference': c3d.OperationType.Difference,
    'gizmo:extrude:intersect': c3d.OperationType.Intersect,
}
for (const key in map) commands.push(key);
commands.push('gizmo:extrude:new-body');

export type ExtrudeKeyboardEvent = { tag: 'boolean', type: number } | { tag: 'new-body' }

export class ExtrudeKeyboardGizmo extends AbstractCommandKeyboardInput<(e: ExtrudeKeyboardEvent) => void> {
    private active?: CancellablePromise<void>;
    private cb?: (e: ExtrudeKeyboardEvent) => void;

    constructor(editor: EditorLike) {
        super('extrude', editor, commands);
    }

    protected resolve(cb: (e: ExtrudeKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:extrude:new-body':
                cb({ tag: 'new-body' });
                break;
            default:
                cb({ tag: 'boolean', type: map[command] });
        }
    }

    execute(cb: (e: ExtrudeKeyboardEvent) => void) {
        this.cb = cb;
        return new CancellablePromise<void>((resolve, reject) => {
            const cancel = () => {
                this.active?.then(() => { }, e => reject(e));
                this.active?.cancel();
            }
            const finish = () => {
                this.active?.then(() => resolve());
                this.active?.finish();
            }
            return { cancel, finish };
        });
    }

    toggle(bool: boolean) {
        if (!bool) {
            this.active?.finish();
            this.active = undefined;
        } else {
            if (this.active === undefined)
                this.active = super.execute(this.cb!);
        }
    }
}
