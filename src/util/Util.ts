// https://www.typescriptlang.org/docs/handbook/mixins.html

import { DisposableLike } from "event-kit";

export type Constructor = new (...args: any[]) => {};
export type GConstructor<T = {}> = new (...args: any[]) => T;
export type AGConstructor<T = {}> = abstract new (...args: any[]) => T;

export type CreateMutable<Type> = {
    -readonly [Property in keyof Type]: Type[Property];
};

export function assertUnreachable(_x: never): never {
    throw new Error("Didn't expect to get here");
}

export class RefCounter<T> {
    private readonly counts: Map<T, [number, Set<Redisposable>]>;

    constructor(from?: RefCounter<T>) {
        if (from) {
            this.counts = new Map(from.counts);
        } else {
            this.counts = new Map<T, [number, Set<Redisposable>]>();
        }
    }

    keys() { return this.counts.keys() }

    has(item: T): boolean {
        return this.counts.has(item);
    }

    incr(item: T, disposable: Redisposable): void {
        if (this.counts.has(item)) {
            const value = this.counts.get(item);
            if (!value) throw new Error("invalid key");

            const [count, disposables] = value;
            disposables.add(disposable);
            this.counts.set(item, [count + 1, disposables])
        } else {
            this.counts.set(item, [1, new Set([disposable])]);
        }
    }

    decr(item: T): void {
        const value = this.counts.get(item);
        if (!value) throw new Error("invalid key");

        const [count, disposable] = value;
        if (count === 1) {
            this.delete(item);
        } else {
            this.counts.set(item, [count - 1, disposable])
        }
    }

    delete(item: T): void {
        const value = this.counts.get(item);
        if (value === undefined) return;
        this.counts.delete(item);

        const [, disposables] = value;
        for (const disposable of disposables) disposable.dispose();
    }

    clear(): void {
        this.counts.clear();
    }
}

export class Redisposable implements DisposableLike {
    constructor(private readonly d: () => void) { }
    dispose() { this.d() }
}

export function CircleGeometry(radius: number, segmentCount: number, arc = 1.0): Float32Array {
    const vertices = new Float32Array((segmentCount * arc + 1) * 3);
    for (let i = 0; i <= segmentCount * arc; i++) {
        const theta = (i / segmentCount) * Math.PI * 2;
        vertices[i * 3] = Math.cos(theta) * radius;
        vertices[i * 3 + 1] = Math.sin(theta) * radius;
        vertices[i * 3 + 2] = 0;
    }
    return vertices;
}

export class WeakValueMap<K, V extends object> {
    private readonly underlying = new Map<K, WeakRef<V>>();

    get(k: K): V | undefined {
        const ref = this.underlying.get(k);
        if (ref === undefined) return;
        const v = ref.deref();
        if (v) {
            return v;
        } else {
            this.underlying.delete(k);
            return;
        }
    }

    set(k: K, v: V): this {
        this.underlying.set(k, new WeakRef(v));
        return this;
    }

    *[Symbol.iterator]() {
        for (const key of this.underlying.keys()) {
            const value = this.get(key);
            if (!value) continue;
            yield [key, value];
        }
    }
}

export const zip = <T, S>(a: Array<T>, b: Array<S>): [T | undefined, S | undefined][] => {
    return Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);
}
