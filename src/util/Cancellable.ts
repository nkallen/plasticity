/**
 * The classes here represent promise-like object that can be cancelled or "finished" earlier than it would normally
 * terminate. For example, a promise that resolves when a user drags a gizmo from point a to b can be canceled by
 * the user hitting ESCAPE. It might be finished by hitting ENTER.
 * 
 * All cancellable objects should be "registered" meaning that if multiple cancellable promises are simultaneously
 * running, the Registor can cancel them all.
 */

import { CompositeDisposable, Disposable } from "event-kit";

export interface Cancellable {
    cancel(): void;
}

export interface Finishable {
    finish(): void;
}

export abstract class ResourceRegistration implements Cancellable, Finishable {
    abstract cancel(): void;
    abstract finish(): void;

    resource(reg: CancellableRegistor): this {
        reg.resource(this);
        return this;
    }
}

export const Cancel = { tag: 'Cancel' };
export const Finish = { tag: 'Finish' };

export type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { dispose: (() => void), finish: (() => void) };

type State = 'None' | 'Cancelled' | 'Finished';

// An object that has a collection of cancellable resources
// This is used for Commands, which have factories, gizmos, etc. which
// can be cancelled / finished /etc.
export abstract class CancellableRegistor {
    private state: State = 'None';
    protected readonly resources: ResourceRegistration[] = [];
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

    resource<T extends ResourceRegistration>(x: T): T {
        this.resources.push(x);
        if (x instanceof CancellablePromise) this.promises.push(x);
        return x
    }

    // All registered gizmos, dialogs, etc. finished successfully.
    get finished() {
        return Promise.all(this.promises)
    }

    ensure(f: () => void) {
        this.disposable.add(new Disposable(f));
    }
}

export class CancellablePromise<T> extends ResourceRegistration implements PromiseLike<T> {
    private state: State = 'None';

    static all(ps: CancellablePromise<any>[]) {
        return new CancellablePromise<void>((resolve, reject) => {
            const dispose = () => {
                for (const p of ps) {
                    p.promise.catch(err => {
                        if (err !== Cancel) reject(err);
                    });
                    p.cancel();
                }
            }
            return { dispose, finish: resolve };
        });
    }

    static resolve() {
        return new CancellablePromise<void>((resolve, reject) => {
            resolve();
            const dispose = () => { }
            const finish = () => { }
            return { dispose, finish };
        });
    }

    _dispose!: () => void;
    _finish!: () => void;
    _reject!: (reason?: any) => void;
    private readonly promise: Promise<T>;

    constructor(executor: Executor<T>) {
        super();
        const that = this;
        this.promise = new Promise<T>((resolve, reject) => {
            const { dispose, finish } = executor(resolve, reject);
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

    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    private _onFinish(reject: (reason?: any) => void) {
        this._finish()
    }
    
    onFinish(cb: (reject: (reason?: any) => void) => void) {
        this._onFinish = cb;
        return this;
    }
}
