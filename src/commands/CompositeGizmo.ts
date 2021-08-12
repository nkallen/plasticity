import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Cancel, CancellablePromise } from "../util/Cancellable";
import { Helper } from "../util/Helpers";
import { AbstractGizmo, EditorLike, GizmoLike, mode } from "./AbstractGizmo";


export abstract class CompositeGizmo<P> extends THREE.Group implements GizmoLike<(p: P) => void>, Helper {
    private readonly gizmos: [AbstractGizmo<any>, (a: any) => void][] = [];

    constructor(protected readonly params: P, protected readonly editor: EditorLike) {
        super();
    }

    protected prepare() {}

    execute(compositeCallback: (params: P) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        this.prepare();

        const disposables = new CompositeDisposable();

        this.editor.helpers.add(this);
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        const p = new CancellablePromise<void>((resolve, reject) => {
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            };
            const finish = () => {
                disposables.dispose();
                resolve();
            };
            return { cancel, finish };
        });

        const cancellables = [];
        for (const [gizmo, miniCallback] of this.gizmos) {
            const executingGizmo = gizmo.execute((x: any) => {
                miniCallback(x);
                compositeCallback(this.params);
            }, finishFast);
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
        for (const [gizmo,] of this.gizmos) {
            if (gizmo === except) {
                gizmo.stateMachine!.isActive = true;
            } else {
                gizmo.stateMachine!.interrupt();
                gizmo.stateMachine!.isActive = false;
            }
        }
    }

    private activateGizmos() {
        for (const [gizmo,] of this.gizmos) {
            gizmo.stateMachine!.isActive = true;
        }
    }

    update(camera: THREE.Camera) {
        for (const [gizmo,] of this.gizmos)
            gizmo.update(camera);
    }
}
