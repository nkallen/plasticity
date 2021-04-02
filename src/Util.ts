// https://www.typescriptlang.org/docs/handbook/mixins.html
export function applyMixins(derivedCtor: any, constructors: any[]) {
    constructors.forEach((baseCtor) => {
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
    private readonly counts = new Map<T, number>();

    has(item: T): boolean {
        return this.counts.has(item);
    }

    incr(item: T) {
        if (this.counts.has(item)) {
            const count = this.counts.get(item);
            this.counts.set(item, count + 1)
        } else {
            this.counts.set(item, 1);
        }
    }

    decr(item: T) {
        const count = this.counts.get(item);
        if (count == 1) {
            this.counts.delete(item);
        } else {
            this.counts.set(item, count - 1)
        }
    }

    clear() {
        this.counts.clear();
    }
}