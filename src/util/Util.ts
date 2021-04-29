// https://www.typescriptlang.org/docs/handbook/mixins.html

import { CompositeDisposable, Disposable } from "event-kit";

export type Constructor = new (...args: any[]) => {};
export type GConstructor<T = {}> = new (...args: any[]) => T;

export function applyMixins(derivedCtor: any, constructors: any[]): void {
    constructors.reverse().forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            if (name == 'constructor') return;
            Object.defineProperty(
                derivedCtor.prototype,
                name,
                Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
                Object.create(null)
            );
        });
    });
}

export function assertUnreachable(_x: never): never {
    throw new Error("Didn't expect to get here");
}

export class RefCounter<T> {
    private readonly counts = new Map<T, [number, CompositeDisposable]>();

    has(item: T): boolean {
        return this.counts.has(item);
    }

    incr(item: T, disposable: Disposable): void {
        if (this.counts.has(item)) {
            const value = this.counts.get(item);
            if (!value) throw "invalid key";

            const [count, disposables] = value;
            disposables.add(disposable);
            this.counts.set(item, [count + 1, disposables])
        } else {
            this.counts.set(item, [1, new CompositeDisposable(disposable)]);
        }
    }

    decr(item: T): void {
        const value = this.counts.get(item);
        if (!value) throw "invalid key";

        const [count, disposable] = value;
        if (count == 1) {
            this.counts.delete(item);
            disposable.dispose();
        } else {
            this.counts.set(item, [count - 1, disposable])
        }
    }

    delete(item: T): void {
        const value = this.counts.get(item);
        if (!value) return;

        const [, disposable] = value;
        this.counts.delete(item);
        disposable.dispose();
    }

    clear(): void {
        this.counts.clear();
    }
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
}