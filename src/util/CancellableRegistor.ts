import { CompositeDisposable, Disposable } from "event-kit";
import signal from "signals";
import { GeometryFactory } from "../command/GeometryFactory";
import { CancellablePromise } from "./CancellablePromise";
import { CancellableRegisterable } from "./CancellableRegisterable";
import { Cancellable } from "./Cancellable";


export type State = 'None' | 'Cancelled' | 'Finished' | 'Interrupted';
/**
 * The CancellableRegistor is an abstract base class for Commands. It implements basic state machine logic for
 * cancel/finish/interrupt. Its main responsibility is to keep track ("register") other objects that can be
 * canceled/etc and delegate to them.
 */

export abstract class CancellableRegistor implements Cancellable {
    readonly factoryChanged = new signal.Signal();
    private _state: State = 'None';
    get state() { return this._state }
    private set state(state: State) { this._state = state }

    protected readonly resources: CancellableRegisterable[] = [];
    protected readonly promises: PromiseLike<any>[] = [];
    private disposable = new CompositeDisposable();

    cancel(): void {
        if (this.state != 'None') return;

        for (const resource of this.resources) {
            if (resource instanceof CancellablePromise)
                resource.then(null, () => null);
            resource.cancel();
        }
        this.disposable.dispose();
        this.state = 'Cancelled';
    }

    finish(): void {
        if (this.state != 'None') return;

        for (const resource of this.resources) {
            resource.finish();
        }
        this.disposable.dispose();
        this.state = 'Finished';
    }

    interrupt(): void {
        if (this.state != 'None') return;
        
        for (const resource of this.resources) {
            resource.interrupt();
        }
        this.disposable.dispose();
        this.state = 'Interrupted';
    }

    resource<T extends CancellableRegisterable>(x: T): T {
        this.resources.push(x);
        if (x instanceof CancellablePromise)
            this.promises.push(x);
        if (x instanceof GeometryFactory) {
            x.changed.add(() => this.factoryChanged.dispatch());
        }
        return x;
    }

    // All registered gizmos, dialogs, etc. finished successfully. Complex commands usually `await` this promise before committing
    get finished() {
        return Promise.all(this.promises);
    }

    // This method is analogous to `finally` in Javascript. Some commands temporarily change state (e.g., raycasting settings).
    // Ensure is a terse API that is guaranteed to run after each command, regardless of whether it completed successfully.
    ensure(f: () => void) {
        this.disposable.add(new Disposable(f));
    }
}
