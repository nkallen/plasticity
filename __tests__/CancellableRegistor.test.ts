import { CancellableRegisterable } from "../src/util/CancellableRegisterable";
import { CancellableRegistor } from "../src/util/CancellableRegistor";

class MyCancellableRegistor extends CancellableRegistor {

}

class MyCancellableRegisterable extends CancellableRegisterable {
    readonly cancelled = jest.fn();
    readonly finished = jest.fn();
    readonly interrupted = jest.fn();

    cancel(): void { this.cancelled(); }
    finish(): void { this.finished(); }
    interrupt(): void { this.interrupted(); }
}

describe(CancellableRegistor, () => {
    test('interrupt when not awaiting', () => {
        const command = new MyCancellableRegistor();
        command.interrupt();
        expect(command.state).toBe('Interrupted');
    });

    test('interrupt when awaiting', async () => {
        const command = new MyCancellableRegistor();
        const finished = command.finished;
        command.interrupt();
        await finished;
        expect(command.state).toBe('Finished');
    });

    test('interrupt with resource when awaiting', async () => {
        const command = new MyCancellableRegistor();
        const finished = command.finished;
        const registerable = new MyCancellableRegisterable();
        const interrupt = jest.spyOn(registerable, 'interrupt');
        const finish = jest.spyOn(registerable, 'finish');
        command.resource(registerable);
        command.interrupt();
        await finished;
        expect(command.state).toBe('Finished');
        expect(interrupt).toHaveBeenCalledTimes(1);
        expect(finish).toHaveBeenCalledTimes(0);
    });

    test('resource when awaiting', async () => {
        const command = new MyCancellableRegistor();
        const finished = command.finished;
        const registerable = new MyCancellableRegisterable();
        command.resource(registerable);
        command.finish();
        expect(registerable.finished).toBeCalledTimes(1);
        await finished;
    })

    test('resource when not awaiting', async () => {
        const command = new MyCancellableRegistor();
        const registerable = new MyCancellableRegisterable();
        command.resource(registerable);
        command.finish();
        expect(registerable.finished).toBeCalledTimes(1);
    })

    test('resource when cancel', async () => {
        const command = new MyCancellableRegistor();
        const registerable = new MyCancellableRegisterable();
        command.resource(registerable);
        command.cancel();
        expect(registerable.cancelled).toBeCalledTimes(1);
    })

    test('resource when resolved not called multiple times', async () => {
        const command = new MyCancellableRegistor();
        const registerable = new MyCancellableRegisterable();
        command.resource(registerable);
        command.cancel();
        command.cancel();
        command.cancel();
        expect(registerable.cancelled).toBeCalledTimes(1);
    })
});
