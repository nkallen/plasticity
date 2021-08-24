import { AbstractCommandKeyboardInput, CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";
import { Mode } from "./FilletFactory";
import c3d from '../../../build/Release/c3d.node';
import { CancellablePromise } from "../../util/Cancellable";

export type FilletKeyboardEvent = { tag: 'add' }

export class FilletKeyboardGizmo extends AbstractCommandKeyboardInput<(e: FilletKeyboardEvent) => void> {
    private active?: CancellablePromise<void>;
    private cb?: (e: FilletKeyboardEvent) => void;

    constructor(editor: EditorLike) {
        super("fillet", editor, [`gizmo:fillet:add`]);
    }

    protected resolve(cb: (e: FilletKeyboardEvent) => void, command: string) {
        switch (command) {
            case `gizmo:fillet:add`:
                cb({ tag: 'add' });
                break;
        }
    }

    execute(cb: (e: FilletKeyboardEvent) => void) {
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

    toggle(mode: Mode) {
        if (mode === c3d.CreatorType.ChamferSolid) {
            this.active?.finish();
            this.active = undefined;
        } else if (mode === c3d.CreatorType.FilletSolid) {
            if (this.active === undefined) {
                this.active = super.execute(this.cb!);
            }
        }
    }
}