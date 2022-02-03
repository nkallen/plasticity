import { Cancel, Finish, Interrupt } from "../src/util/Cancellable";
import { CancellablePromise } from "../src/util/CancellablePromise";

describe(CancellablePromise, () => {
    let c1: CancellablePromise<number>;
    let c1_resolve: (value: number | PromiseLike<number>) => void;
    let c1_reject: (reason?: any) => void;
    let dispose1: jest.Mock<any, any>;
    let finish1: jest.Mock<any, any>;

    beforeEach(() => {
        dispose1 = jest.fn();
        finish1 = jest.fn();

        c1 = new CancellablePromise<number>((resolve, reject) => {
            c1_resolve = resolve; c1_reject = reject;
            return { dispose: dispose1, finish: () => { finish1(); resolve(1) } };
        });
    });

    test('resolve', async () => {
        c1_resolve(2);
        const result = await c1;
        expect(result).toBe(2);
    });

    test('reject', async () => {
        const error = new Error();
        c1_reject(error);
        await expect(c1).rejects.toBe(error);
    });

    test('cancel', async () => {
        c1.cancel();
        await expect(c1).rejects.toBeInstanceOf(Cancel);
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(0);
    });

    test('finish', async () => {
        c1.finish();
        await c1;
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(1);
    });

    test('interrupt', async () => {
        c1.interrupt();
        await c1;
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(1);
    });

    test('rejectOnInterrupt', async () => {
        c1.rejectOnInterrupt();
        c1.interrupt();
        await expect(c1).rejects.toBeInstanceOf(Interrupt);
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(0);
    });

    test('rejectOnFinish', async () => {
        c1.rejectOnFinish();
        c1.finish();
        await expect(c1).rejects.toBeInstanceOf(Finish);
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(0);
    });

    describe('all', () => {
        let c2: CancellablePromise<void>;
        let c3: CancellablePromise<void>;
        let all: CancellablePromise<void>;
        let dispose2: jest.Mock<any, any>;
        let dispose3: jest.Mock<any, any>;

        beforeEach(() => {
            dispose2 = jest.fn();
            dispose3 = jest.fn();

            c2 = new CancellablePromise<void>((resolve, reject) => {
                return { dispose: dispose2, finish: resolve };
            });
            c3 = new CancellablePromise<void>((resolve, reject) => {
                return { dispose: dispose3, finish: resolve };
            });

            all = CancellablePromise.all([c1, c2, c3]);
        });

        test('Finishing all resolves the promise', async () => {
            all.finish();
            await all;
        });

        test('Finishing all rejects the child promises', async () => {
            all.finish();
            await all;
            await expect(c1).rejects.toBeInstanceOf(Cancel);
            await expect(c2).rejects.toBeInstanceOf(Cancel);
            await expect(c3).rejects.toBeInstanceOf(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
        });

        test('Finishing a child resolves the top promises', async () => {
            c1.finish();
            await c1;
            await all;
            await expect(c2).rejects.toBeInstanceOf(Cancel);
            await expect(c3).rejects.toBeInstanceOf(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
        });

        test('Cancelling a child rejects the top promises', async () => {
            c1.cancel();
            await expect(c1).rejects.toBeInstanceOf(Cancel);
            await expect(all).rejects.toBeInstanceOf(Cancel);
            await expect(c2).rejects.toBeInstanceOf(Cancel);
            await expect(c3).rejects.toBeInstanceOf(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
            await expect(all).rejects.toBeInstanceOf(Cancel);
        });

        test('A child erroring rejects the all', async () => {
            const error = new Error();
            c1_reject(error);
            await expect(c1).rejects.toBe(error);
            await expect(all).rejects.toBe(error);
        });
    })

    test('map success', async () => {
        let c2 = c1.map(() => 1);
        c1.finish();
        expect(await c2).toBe(1);
    })

    test('map failure', async () => {
        let c2 = c1.map(() => 1);
        c1.cancel();
        await expect(c2).rejects.toBeInstanceOf(Cancel);
    })
})