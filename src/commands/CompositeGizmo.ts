import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { CancellablePromise } from "../util/Cancellable";
import { Helper } from "../util/Helpers";
import { AbstractGizmo, EditorLike, GizmoLike, Mode } from "./AbstractGizmo";

export abstract class CompositeGizmo<P> extends Helper implements GizmoLike<(p: P) => void> {
    private readonly gizmos: [AbstractGizmo<any>, (a: any) => void][] = [];

    constructor(protected readonly params: P, protected readonly editor: EditorLike) {
        super();
    }

    protected prepare(mode: Mode) { }

    execute(compositeCallback: (params: P) => void, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        this.prepare(mode);

        const disposables = new CompositeDisposable();

        this.editor.helpers.add(this);
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        const p = new CancellablePromise<void>((resolve, reject) => {
            return { dispose: () => disposables.dispose(), finish: resolve };
        });

        const cancellables = [];
        for (const [gizmo, miniCallback] of this.gizmos) {
            const executingGizmo = gizmo.execute((x: any) => {
                miniCallback(x);
                compositeCallback(this.params);
            }, mode);
            cancellables.push(executingGizmo);
        }

        return CancellablePromise.all([p, ...cancellables]);
    }

    addGizmo<T>(gizmo: AbstractGizmo<(t: T) => void>, cb: (t: T) => void) {
        this.gizmos.push([gizmo, cb]);
        gizmo.addEventListener('start', () => this.deactivateGizmosExcept(gizmo));
        gizmo.addEventListener('end', () => this.activateGizmos());
    }

    private deactivateGizmosExcept<T>(except: AbstractGizmo<(t: T) => void>) {
        for (const [gizmo] of this.gizmos) {
            if (gizmo === except) {
                gizmo.stateMachine!.isActive = true;
            } else {
                gizmo.stateMachine!.interrupt();
                gizmo.stateMachine!.isActive = false;
            }
        }
    }

    private activateGizmos() {
        for (const [gizmo] of this.gizmos) {
            gizmo.stateMachine!.isActive = true;
        }
    }

    update(camera: THREE.Camera) {
        super.update(camera);
        for (const [gizmo,] of this.gizmos) gizmo.update(camera);
    }
}
