import { Cancellable } from "./Cancellable";
import { CancellableRegistor, State } from "./CancellableRegistor";

/**
 * A companion object to CancellableRegistor. This object can be "registered" to the registor. In other words,
 * The registor has many registerables; when you tell the registor to cancel, it cancels all its registerables.
 * This class exists primarily to create a terse API inside of Commands.
 */

export abstract class CancellableRegisterable implements Cancellable {
    abstract cancel(): void;
    abstract finish(): void;
    abstract interrupt(state?: State): void;

    resource(reg: CancellableRegistor): this {
        reg.resource(this);
        return this;
    }
}
