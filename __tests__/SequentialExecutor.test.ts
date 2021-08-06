import { Delay, SequentialExecutor } from "../src/util/SequentialExecutor";
import './matchers';

describe(SequentialExecutor, () => {
    test('it waits for first job to finish before executing second', async () => {
        const delay1 = new Delay<void>();
        const delay2 = new Delay<void>();

        const queue = new SequentialExecutor();
        let foo = false, bar = false;
        const p1 = queue.enqueue(() => {
            foo = true;
            return delay1.promise;
        });
        const p2 = queue.enqueue(() => {
            bar = true;
            return delay2.promise;
        });
        expect(foo).toBe(true);
        expect(bar).toBe(false);

        delay1.resolve();
        await p1;

        expect(foo).toBe(true);
        expect(bar).toBe(true);

        delay2.resolve();
        await p2;

        expect(foo).toBe(true);
        expect(bar).toBe(true);
    });

    test('a failing job does not prevent subsequent execution', async () => {
        const delay1 = new Delay<void>();
        const delay2 = new Delay<void>();

        const queue = new SequentialExecutor();
        let foo = false, bar = false;
        const p1 = queue.enqueue(() => {
            foo = true;
            return delay1.promise;
        });
        const p2 = queue.enqueue(() => {
            bar = true;
            return delay2.promise;
        });
        expect(foo).toBe(true);
        expect(bar).toBe(false);

        delay1.reject(new Error());
        await expect(p1).rejects.toThrow();

        expect(foo).toBe(true);
        expect(bar).toBe(true);

        delay2.resolve();

        await p2;
    });

    test('a top-level job completes AFTER recursively enqueued jobs complete', async () => {
        const delay1 = new Delay<void>();
        const delay2 = new Delay<void>();

        const queue = new SequentialExecutor();
        let p2, p1clock, p2clock, clock = 0;
        const p1 = queue.enqueue(() => {
            p2 = queue.enqueue(() => {
                return delay2.promise.then(() => p2clock = clock++);
            });
            return delay1.promise;
        }).then(() => p1clock = clock++);

        delay1.resolve();
        delay2.resolve();

        await p1;
        await p2;

        expect(p2clock).toBe(0);
        expect(p1clock).toBe(1);
    });
});
