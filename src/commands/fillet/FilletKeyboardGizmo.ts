import c3d from '../../../build/Release/c3d.node';
import { CancellablePromise } from "../../util/Cancellable";
import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";
import { Mode } from "./FilletFactory";

export class ChamferAndFilletKeyboardGizmo  {
    private active?: CancellablePromise<void>;
    private cb!: (e: string) => void;

    constructor(private readonly editor: EditorLike) { }

    execute(cb: (e: string) => void) {
        this.cb = cb;
        return new CancellablePromise<void>((resolve, reject) => {
            const dispose = () => this.active?.dispose();
            return { dispose, finish: resolve };
        });
    }

    toggle(mode: Mode) {
        if (mode === c3d.CreatorType.ChamferSolid) {
            this.active?.finish();
            this.active = undefined;
        } else if (mode === c3d.CreatorType.FilletSolid) {
            if (this.active === undefined) {
                this.active = new FilletKeyboardGizmo(this.editor).execute(this.cb);
            }
        }
    }
}

export class FilletKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super("fillet", editor, [`gizmo:fillet-solid:add`]);
    }
}