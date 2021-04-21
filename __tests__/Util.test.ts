import { Disposable } from "event-kit";
import { RefCounter, WeakValueMap } from "../src/Util";

describe('RefCounter', () => {
    let refCounter: RefCounter<unknown>;

    beforeEach(() => {
        refCounter = new RefCounter();
    });

    test('incr/decr creates and deletes', () => {
        const x = {};
        expect(refCounter.has(x)).toBeFalsy();
        let d1: jest.Mock<unknown>, d2: jest.Mock<unknown>;
        refCounter.incr(x, new Disposable(d1 = jest.fn()));
        refCounter.incr(x, new Disposable(d2 = jest.fn()));
        expect(d1).not.toHaveBeenCalled();
        expect(d2).not.toHaveBeenCalled();
        refCounter.decr(x);
        expect(d1).not.toHaveBeenCalled();
        expect(d2).not.toHaveBeenCalled();
        refCounter.decr(x);
        expect(d1).toHaveBeenCalledTimes(1);
        expect(d2).toHaveBeenCalledTimes(1);
    });
});

describe('WeakValueMap', () => {
    let map: WeakValueMap<string, Record<string, unknown>>;

    beforeEach(() => {
        map = new WeakValueMap();
    });

    test('incr/decr creates and deletes', () => {
        let x = {};
        expect(map.get("foo")).toBeUndefined();
        map.set("foo", x);
        expect(map.get("foo")).toBe(x);
        x = undefined;
        // expect(map.get("foo")).toBeUndefined();
    });
})