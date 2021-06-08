/**
 * The classes here represent promise-like object that can be cancelled or "finished" earlier than it would normally
 * terminate. For example, a promise that resolves when a user drags a gizmo from point a to b can be canceled by
 * the user hitting ESCAPE. It might be finished by hitting ENTER.
 * 
 * All cancellable objects should be "registered" meaning that if multiple cancellable promises are simultaneously
 * running, the Registor can cancel them all.
 */

import { Disposable } from "event-kit";

export abstract class Cancellable {
    abstract cancel(): void;
    abstract finish(): void;

    resource(reg: CancellableRegistor): this {
        reg.resource(this);
        return this;
    }

    finally(reg: CancellableRegistor): this {
        reg.finally(this);
        return this;
    }
}

export class CancellableDisposable extends Cancellable {
    constructor(private readonly disposable: Disposable) {
        super();
    }

    cancel() {
        this.disposable.dispose();
    }

    finish() {
        this.cancel();
    }
}

export const Cancel = { tag: 'Cancel' };
export const Finish = { tag: 'Finish' };

type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { cancel: (() => void), finish: (() => void) };

type State = 'None' | 'Cancelled' | 'Finished';

// An object that has a collection of cancellable resources
// This is used for Commands, which have factories, gizmos, etc. which
// can be cancelled / finished /etc.
export abstract class CancellableRegistor {
    private readonly resources: Cancellable[] = [];
    private _finally?: Cancellable;
    state: State = 'None';

    cancel(): void {
        for (const resource of this.resources) {
            resource.cancel();
        }
        this._finally?.cancel();
        this.state = 'Cancelled';
    }

    finish(): void {
        this._finally?.finish();
        for (const resource of this.resources) {
            resource.cancel();
        }
        this.state = 'Finished';
    }

    resource<T extends Cancellable>(x: T): T {
        this.resources.push(x);
        return x
    }

    finally<T extends Cancellable>(x: T): T {
        this._finally = x;
        return x;
    }
}

export class CancellablePromise<T> extends Cancellable {
    static resolve() {
        return new CancellablePromise<void>((resolve, reject) => {
            resolve();
            const cancel = () => {}
            const finish = () => {}
            return { cancel, finish };
        });
    }

    cancel!: () => void;
    finish!: () => void;
    promise: Promise<T>;

    constructor(executor: Executor<T>) {
        super();
        const that = this;
        this.promise = new Promise<T>((resolve, reject) => {
            const { cancel, finish } = executor(resolve, reject);
            that.cancel = cancel;
            that.finish = finish;
        });
    }

    then(resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void {
        this.promise.then(resolve, reject);
    }
}
