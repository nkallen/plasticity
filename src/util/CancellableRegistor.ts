import { CompositeDisposable, Disposable } from "event-kit";
import signal from "signals";
import { GeometryFactory } from "../command/GeometryFactory";
import { AlreadyFinishedError, CancellablePromise } from "./CancellablePromise";
import { CancellableRegisterable } from "./CancellableRegisterable";
import { Cancellable } from "./Cancellable";


export type State = 'None' | 'Awaiting' | 'Cancelled' | 'Finished' | 'Interrupted';
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
        if (this.state !== 'None' && this.state !== 'Awaiting') return;

        for (const resource of this.resources) {
            if (resource instanceof CancellablePromise)
                resource.then(null, () => null);
            resource.cancel();
        }
        this.disposable.dispose();
        this.state = 'Cancelled';
    }

    finish(): void {
        if (this.state !== 'None' && this.state !== 'Awaiting') return;

        for (const resource of this.resources) {
            resource.finish();
        }
        this.disposable.dispose();
        this.state = 'Finished';
    }

    // Interruption happens when the user takes some action to start a new command while
    // some command is already running. Normally this should cancel the current command.
    // However, when the command is in the 'Awaiting' state, the command is ready to be commit
    // (i.e., the user entered all necessary data) and we generally interpret that as a commit.
    // HOWEVER, in some cases, like when rejectOnInterrupt() is explicitly called, we rely
    // calling interrupt will trigger an exception and the command will not be commit.
    interrupt(): void {
        switch (this.state) {
            case 'None':
                for (const resource of this.resources) {
                    resource.interrupt(this.state);
                }
                this.disposable.dispose();
                this.state = 'Interrupted';
                break;
            case 'Awaiting':
                for (const resource of this.resources) {
                    resource.interrupt(this.state);
                }
                // And here we DO NOT change the state because the CommandExecutor will explicity call .finish()
                // IFF the Command.execute() completed without erroring
        }
    }

    resource<T extends CancellableRegisterable>(x: T): T {
        if (this.state !== 'None' && this.state !== 'Awaiting') {
            x.cancel();
            throw new AlreadyFinishedError();
        }

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
        if (this.state !== 'None') {
            throw new AlreadyFinishedError();
        }
        this.state = 'Awaiting';
        return Promise.all(this.promises);
    }

    // This method is analogous to `finally` in Javascript. Some commands temporarily change state (e.g., raycasting settings).
    // Ensure is a terse API that is guaranteed to run after each command, regardless of whether it completed successfully.
    ensure(f: () => void) {
        if (this.state !== 'None' && this.state !== 'Awaiting') {
            f();
            throw new AlreadyFinishedError();
        }
        this.disposable.add(new Disposable(f));
    }
}
