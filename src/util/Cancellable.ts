
/**
 * The classes here represent promise-like object that can be cancelled, finished, or interrupted earlier than it
 * would normally terminate. For example, a promise that resolves when a user drags a gizmo from point a to b can
 * be canceled by the user hitting ESCAPE. It might be finished by hitting ENTER. Or it might be interrupted by the
 * user starting another command.
 * 
 * All cancellable objects should be "registered" meaning that if multiple cancellable promises are simultaneously
 * running, the Registor can cancel them all.
 */

export interface Cancellable {
    cancel(): void;
    finish(): void;
    interrupt(): void;
}

export class Cancel extends Error { }
export class Finish extends Error { }
export class Interrupt extends Error { }

export type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => { dispose: (() => void), finish: (() => void) };
