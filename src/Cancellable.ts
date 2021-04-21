import Command from "./commands/Command";

/**
 * The classes here represent promise-like object that can be cancelled or "finished" earlier than it would normally
 * terminate. For example, a promise that resolves when a user drags a gizmo from point a to b can be canceled by
 * the user hitting escape. It might be finished by hitting return.
 * 
 * All cancellable objects should be "registered" meaning that if multiple cancellable promises are simultaneously
 * running, the Registor can cancel them all.
 */

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
};

export const Cancel = {};
export const Finish = {};

type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { cancel: (() => void), finish: (() => void) };

export abstract class CancellableRegistor {
    private readonly resources: Cancellable[] = [];
    private _finally?: Cancellable;

    cancel() {
        for (const resource of this.resources) {
            resource.cancel();
        }
        this._finally?.cancel();
    }

    finish() {
        this._finally?.finish();
        for (const resource of this.resources) {
            resource.cancel();
        }
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
    cancel!: () => void;
    finish!: () => void;
    executor: Executor<T>;

    constructor(executor: Executor<T>) {
        super();
        this.executor = executor;
    }

    then(resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) {
        const { cancel, finish } = this.executor(resolve, reject);
        this.cancel = cancel;
        this.finish = finish;
    }
}
