import Command from "./commands/Command";

export type Cancellable =  { cancel: () => void, finish: () => void };

export const Cancel = {};
export const Finish = {};

type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { cancel: (() => void), finish: (() => void) };

export class CancellablePromise<T> {
    cancel: () => void;
    finish: () => void;
    executor: Executor<T>;

    constructor(executor: Executor<T>) {
        this.executor = executor;
    }

    then(resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) {
        const { cancel, finish } = this.executor(resolve, reject);
        this.cancel = cancel;
        this.finish = finish;
    }

    register(command: Command): this {
        command.register(this);
        return this;
    }
}
