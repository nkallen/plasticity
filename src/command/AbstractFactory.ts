import { TemporaryObject } from "../editor/DatabaseLike";
import { CancellableRegisterable } from "../util/CancellableRegisterable";
import { State as CancellableRegisterableState } from "../util/CancellableRegistor";
import { toArray } from "../util/Conversion";

/**
 * The AbstractFactory is a very generic superclass to handle an update() cancel() commit() workflow
 * involving modifying or creating objects.
 * 
 * This class is mostly protected helper functions for the management of creation and cleanup of
 * TemporaryObjects. The idea is that a concrete Factory creates/updates model objects as well
 * as displays view objects, including temporary view objects to show an in-progress operation.
 * 
 * The canonical subclass of this is the GeometryFactory which is responsible for creating breps
 * and triangulations and displaying the results to the user. But there are other model/view objects
 * in the system, for example Empties, that have a similar workflow.
 * 
 */

export abstract class AbstractFactory<T extends THREE.Object3D> extends CancellableRegisterable {
    protected get originalItem(): T | T[] | undefined { return undefined; }
    protected get originalItems() { return toArray(this.originalItem); }
    protected temps: TemporaryObject[] = [];

    // NOTE: Some factories mutate the original items as an optimization; it's safer to rollback here rather
    // than ad hoc, as the following is basically a global invariant:
    private ensureTemporaryModificationsToOriginalItemsAreRolledBack() {
        for (const item of this.originalItems) {
            item.matrixAutoUpdate = true;
            item.position.set(0, 0, 0);
            item.quaternion.identity();
            item.scale.set(1, 1, 1);
            item.updateMatrixWorld();
            item.visible = true;
        }
    }

    protected restoreOriginalItems() {
        this.ensureTemporaryModificationsToOriginalItemsAreRolledBack();
    }

    protected cleanupTemps() {
        for (const temp of this.temps)
            temp.cancel();
        this.temps = [];
    }

    protected showTemps(finished: TemporaryObject[]) {
        for (const temp of finished) {
            temp.show();
            temp.underlying.updateMatrixWorld();
        }

        return finished;
    }

    protected finalize() {
        this.cleanupTemps();
        this.restoreOriginalItems();
    }

    protected abstract doUpdate(abortEarly: () => boolean, options?: any): Promise<TemporaryObject[]>;
    protected abstract doCommit(): Promise<T | T[]>;
    doCancel() { this.finalize(); }

    async update(): Promise<void> { await this.doUpdate(() => false); }
    async commit(): Promise<T | T[]> { return this.doCommit(); }
    cancel() { this.doCancel(); }

    finish() { /* NOTE: finish is a noop */ }
    interrupt(state?: CancellableRegisterableState) {
        if (state !== 'Awaiting') this.cancel();
    }
}
