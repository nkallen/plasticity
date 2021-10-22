/**
 * The classes here represent promise-like object that can be cancelled, finished, or interrupted earlier than it
 * would normally terminate. For example, a promise that resolves when a user drags a gizmo from point a to b can
 * be canceled by the user hitting ESCAPE. It might be finished by hitting ENTER. Or it might be interrupted by the
 * user starting another command.
 * 
 * All cancellable objects should be "registered" meaning that if multiple cancellable promises are simultaneously
 * running, the Registor can cancel them all.
 */

import { CompositeDisposable, Disposable } from "event-kit";

export interface Cancellable {
    cancel(): void;
    finish(): void;
    interrupt(): void;
}

export const Cancel = { tag: 'Cancel' };
export const Finish = { tag: 'Finish' };
export const Interrupt = { tag: 'Interrupt' };

export type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { dispose: (() => void), finish: (() => void) };

type State = 'None' | 'Cancelled' | 'Finished' | 'Interrupted';

/**
 * The CancellableRegistor is an abstract base class for Commands. It implements basic state machine logic for
 * cancel/finish/interrupt. Its main responsibility is to keep track ("register") other objects that can be
 * canceled/etc and delegate to them.
 */
export abstract class CancellableRegistor implements Cancellable {
    private state: State = 'None';
    protected readonly resources: CancellableRegisterable[] = [];
    protected readonly promises: PromiseLike<any>[] = [];
    private disposable = new CompositeDisposable();

    cancel(): void {
        if (this.state != 'None') return;
        for (const resource of this.resources) {
            if (resource instanceof CancellablePromise) resource.then(null, () => null);
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
        if (x instanceof CancellablePromise) this.promises.push(x);
        return x
    }

    // All registered gizmos, dialogs, etc. finished successfully. Complex commands usually `await` this promise before committing
    get finished() {
        return Promise.all(this.promises)
    }

    // This method is analogous to `finally` in Javascript. Some commands temporarily change state (e.g., raycasting settings).
    // Ensure is a terse API that is guaranteed to run after each command, regardless of whether it completed successfully.
    ensure(f: () => void) {
        this.disposable.add(new Disposable(f));
    }
}

/**
 * A companion object to CancellableRegistor. This object can be "registered" to the registor. In other words,
 * The registor has many registerables; when you tell teh registor to cancel, it cancels all its registerables.
 * This class exists primarily to create a terse API inside of Commands.
 */
export abstract class CancellableRegisterable implements Cancellable {
    abstract cancel(): void;
    abstract finish(): void;
    abstract interrupt(): void;

    resource(reg: CancellableRegistor): this {
        reg.resource(this);
        return this;
    }
}

/**
 * This is one of absolute key classes of this codebase. This is an extension to a javascript promise that
 * can be cancelled/finished/interrupted. Gizmos, Dialogs, PointPickers, ObjectPickers, and so forth, all create
 * CancellablePromises, usually via a method named "execute".
 * 
 * Often, a Command is a multi-step process for the user, almost like a "wizard". To create a box, the user picks
 * three points, one after another. The users choices are modeled in the codebase as promises. And they can be cancelled
 * when the user hits escape (for instance).
 */
export class CancellablePromise<T> extends CancellableRegisterable implements PromiseLike<T> {
    private state: State = 'None';

    static all(ps: CancellablePromise<any>[]) {
        const result = new CancellablePromise<void>((resolve, reject) => {
            const dispose = () => {
                for (const p of ps) {
                    p.promise.catch(err => {
                        if (err !== Cancel) reject(err);
                    });
                    p.cancel();
                }
            }
            for (const p of ps) {
                p.then(resolve, reject);
            }
            return { dispose, finish: resolve };
        });
        return result;
    }

    static resolve() {
        return new CancellablePromise<void>((resolve, reject) => {
            resolve();
            const dispose = () => { }
            const finish = () => { }
            return { dispose, finish };
        });
    }

    private _dispose!: () => void;
    private _finish!: () => void;
    private _reject!: (reason?: any) => void;
    private readonly promise: Promise<T>;

    dispose() { this._dispose() }

    constructor(executor: Executor<T>) {
        super();
        const that = this;
        this.promise = new Promise<T>((resolve, reject) => {
            const { dispose, finish } = executor(
                t => {
                    resolve(t)
                    this.finalize('Finished');
                },
                reason => {
                    reject(reason)
                    this.finalize('Cancelled');
                }
            );
            that._dispose = dispose;
            that._finish = finish;
            this._reject = reject;
        });
    }

    cancel() {
        if (this.state != 'None') return;
        try {
            this._dispose();
            this._reject(Cancel);
        } finally {
            this.state = 'Cancelled';
        }
    }

    finish() {
        if (this.state != 'None') return;
        try {
            this._dispose();
            this._onFinish(this._reject);
        } finally {
            this.state = 'Finished';
        }
    }

    interrupt() {
        if (this.state != 'None') return;
        try {
            this._dispose();
            this._onInterrupt(this._reject);
        } finally {
            this.state = 'Finished';
        }
    }

    finalize(state: State) { // FIXME who calls this?
        if (this.state != 'None') return;
        this.state = state;
    }

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    private _onFinish(reject: (reason?: any) => void) {
        this._finish();
    }

    onFinish(cb: (reject: (reason?: any) => void) => void) {
        this._onFinish = cb;
        return this;
    }

    private _onInterrupt(reject: (reason?: any) => void) {
        this._finish();
    }

    onInterrupt(cb: (reject: (reason?: any) => void) => void) {
        this._onInterrupt = cb;
        return this;
    }

    rejectOnInterrupt(): this {
        return this.onInterrupt(reject => reject(Interrupt));
    }

    rejectOnFinish(): this {
        return this.onFinish(reject => reject(Finish));
    }
}
