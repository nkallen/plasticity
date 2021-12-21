import { Cancellable } from "./Cancellable";
import { CancellableRegistor } from "./CancellableRegistor";

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
