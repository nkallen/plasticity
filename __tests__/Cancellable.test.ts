import { Cancel, Finish, Interrupt } from "../src/util/Cancellable";
import { CancellablePromise } from "../src/util/CancellablePromise";

describe(CancellablePromise, () => {
    let c1: CancellablePromise<void>;
    let dispose1: jest.Mock<any, any>;
    let finish1: jest.Mock<any, any>;

    beforeEach(() => {
        dispose1 = jest.fn();
        finish1 = jest.fn();

        c1 = new CancellablePromise<void>((resolve, reject) => {
            return { dispose: dispose1, finish: () => { finish1(); resolve() } };
        });
    });

    test('cancel', async () => {
        c1.cancel();
        await expect(c1).rejects.toBe(Cancel);
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
        await expect(c1).rejects.toBe(Interrupt);
        expect(dispose1).toBeCalledTimes(1);
        expect(finish1).toBeCalledTimes(0);
    });

    test('rejectOnFinish', async () => {
        c1.rejectOnFinish();
        c1.finish();
        await expect(c1).rejects.toBe(Finish);
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
            dispose1 = jest.fn();
            dispose2 = jest.fn();
            dispose3 = jest.fn();

            c1 = new CancellablePromise<void>((resolve, reject) => {
                return { dispose: dispose1, finish: resolve };
            });
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
            await expect(c1).rejects.toBe(Cancel);
            await expect(c2).rejects.toBe(Cancel);
            await expect(c3).rejects.toBe(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
        });

        test('Finishing a child resolves the top promises', async () => {
            c1.finish();
            await c1;
            await all;
            await expect(c2).rejects.toBe(Cancel);
            await expect(c3).rejects.toBe(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
        });

        test('Cancelling a child rejects the top promises', async () => {
            c1.cancel();
            await expect(c1).rejects.toBe(Cancel);
            await expect(all).rejects.toBe(Cancel);
            await expect(c2).rejects.toBe(Cancel);
            await expect(c3).rejects.toBe(Cancel);
            expect(dispose1).toBeCalledTimes(1);
            expect(dispose2).toBeCalledTimes(1);
            expect(dispose3).toBeCalledTimes(1);
        });
    })
})