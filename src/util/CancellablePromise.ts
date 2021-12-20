import { CancellableRegisterable } from "./CancellableRegisterable";
import { Cancel, Executor, Interrupt, Finish } from "./Cancellable";
import { State } from "./CancellableRegistor";

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
            let runOnce = false;
            const dispose = () => {
                if (runOnce)
                    return;
                runOnce = true;
                for (const p of ps) {
                    p.promise.catch(err => {
                        if (err !== Cancel)
                            reject(err);
                    });
                    p.cancel();
                }
            };
            for (const p of ps) {
                p.then(r => { dispose(); resolve(r); }, r => { dispose(); reject(r); });
            }
            return { dispose, finish: resolve };
        });
        return result;
    }

    static resolve() {
        return new CancellablePromise<void>((resolve, reject) => {
            resolve();
            const dispose = () => { };
            const finish = () => { };
            return { dispose, finish };
        });
    }

    private _dispose!: () => void;
    private _finish!: () => void;
    private _reject!: (reason?: any) => void;
    private readonly promise: Promise<T>;

    dispose() { this._dispose(); }

    constructor(executor: Executor<T>) {
        super();
        const that = this;
        this.promise = new Promise<T>((resolve, reject) => {
            const { dispose, finish } = executor(
                t => {
                    resolve(t);
                    this.finalize('Finished');
                },
                reason => {
                    reject(reason);
                    this.finalize('Cancelled');
                }
            );
            that._dispose = dispose;
            that._finish = finish;
            this._reject = reject;
        });
    }

    cancel() {
        if (this.state != 'None')
            return;
        try {
            this._dispose();
            this._reject(Cancel);
        } finally {
            this.state = 'Cancelled';
        }
    }

    finish() {
        if (this.state != 'None')
            return;
        try {
            this._dispose();
            this._onFinish(this._reject);
        } finally {
            this.state = 'Finished';
        }
    }

    interrupt() {
        if (this.state != 'None')
            return;
        try {
            this._dispose();
            this._onInterrupt(this._reject);
        } finally {
            this.state = 'Finished';
        }
    }

    finalize(state: State) {
        if (this.state != 'None')
            return;
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
