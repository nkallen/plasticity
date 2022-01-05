import { CompositeDisposable, Disposable } from "event-kit";
import CommandRegistry from "../components/atom/CommandRegistry";
import { EditorSignals } from "../editor/EditorSignals";
import { CancellablePromise } from "../util/CancellablePromise";
import { GeometryFactory } from "./GeometryFactory";

export interface EditorLike {
    signals: EditorSignals;
    registry: CommandRegistry;
}

export interface Executable<I, O> {
    execute(cb: (i: I) => O): CancellablePromise<O>;
}

export class Quasimode<I> implements Executable<I, void> {
    constructor(private readonly name: string, private readonly editor: EditorLike, private readonly factory: GeometryFactory, private readonly executable: Executable<I, any>) {

    }

    execute(cb: (i: I) => any): CancellablePromise<void> {
        const { factory, executable, editor: { registry, signals }, name } = this;

        const disposables = new CompositeDisposable();
        const cancellable = new CancellablePromise<void>((resolve, reject) => {
            const start = registry.addOne(document.body, "command:quasimode:start", e => {
                document.body.setAttribute('quasimode', name);
                factory.pause();
                const execution = executable.execute(params => {
                    cb(params);
                    signals.quasimodeChanged.dispatch();
                });
                disposables.add(new Disposable(() => execution.finish()));

                const stop = registry.addOne(document.body, "command:quasimode:stop", e => {
                    document.body.removeAttribute('quasimode');
                    factory.resume();
                    stop.dispose();
                    execution.finish();
                    factory.update();
                    signals.quasimodeChanged.dispatch();
                })
                disposables.add(stop);

                signals.quasimodeChanged.dispatch();
            });
            disposables.add(start);

            const dispose = () => disposables.dispose();
            const finish = () => resolve();
            return { dispose, finish };
        });
        return cancellable;
    }
}
