// https://www.typescriptlang.org/docs/handbook/mixins.html

import { CompositeDisposable, Disposable } from "event-kit";

export type Constructor = new (...args: any[]) => {};
export type GConstructor<T = {}> = new (...args: any[]) => T;

export function assertUnreachable(x: never): never {
    throw new Error("Didn't expect to get here");
}

export function applyMixins(derivedCtor: any, constructors: any[]) {
    constructors.reverse().forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            Object.defineProperty(
                derivedCtor.prototype,
                name,
                Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
                Object.create(null)
            );
        });
    });
}

export class RefCounter<T> {
    private readonly counts = new Map<T, [number, CompositeDisposable]>();

    has(item: T): boolean {
        return this.counts.has(item);
    }

    incr(item: T, disposable: Disposable) {
        if (this.counts.has(item)) {
            const [count, disposables] = this.counts.get(item);
            disposables.add(disposable);
            this.counts.set(item, [count + 1, disposables])
        } else {
            this.counts.set(item, [1, new CompositeDisposable(disposable)]);
        }
    }

    decr(item: T) {
        const [count, disposable] = this.counts.get(item);
        if (count == 1) {
            this.counts.delete(item);
            disposable.dispose();
        } else {
            this.counts.set(item, [count - 1, disposable])
        }
    }

    delete(item: T) {
        if (!this.counts.has(item)) return;

        const [_, disposable] = this.counts.get(item);
        this.counts.delete(item);
        disposable.dispose();
    }

    clear() {
        this.counts.clear();
    }
}

export function CircleGeometry(radius: number, segmentCount: number, arc: number = 1.0) {
    const vertices = new Float32Array((segmentCount * arc + 1) * 3);
    for (let i = 0; i <= segmentCount * arc; i++) {
        var theta = (i / segmentCount) * Math.PI * 2;
        vertices[i * 3] = Math.cos(theta) * radius;
        vertices[i * 3 + 1] = Math.sin(theta) * radius;
        vertices[i * 3 + 2] = 0;
    }
    return vertices;
}

export class WeakValueMap<K, V extends {}> {
    private readonly underlying = new Map<K, WeakRef<V>>();

    get(k: K) {
        const ref = this.underlying.get(k);
        const v = ref.deref();
        if (v) {
            return v;
        } else {
            this.underlying.delete(k);
            return null;
        }
    }

    set(k: K, v: V) {
        this.underlying.set(k, new WeakRef(v));
    }
}