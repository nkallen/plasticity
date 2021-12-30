import { GeometryFactory } from './GeometryFactory';

export function delegate<T extends GeometryFactory>(target: GeometryFactory & { factories: T[] }, propertyKey: keyof T) {
    let value: any;
    Object.defineProperty(target, propertyKey, {
        get() { return value },
        set(t: any) {
            value = t;
            const that = this as GeometryFactory & { factories: T[] };
            const factories = that['factories'] as T[];
            factories.forEach(i => i[propertyKey] = t);
        }
    })
}

delegate.default = function (initial?: any) {
    return function <T extends GeometryFactory>(target: GeometryFactory & { factories: T[] }, propertyKey: keyof T) {
        let value = initial;
        Object.defineProperty(target, propertyKey, {
            get() { return value },
            set(t: any) {
                value = t;
                const that = this as GeometryFactory & { factories: T[] };
                const factories = that['factories'] as T[];
                factories.forEach(i => i[propertyKey] = t);
            }
        })
    }
}

delegate.some = function <T extends GeometryFactory>(target: GeometryFactory & { factories: T[] }, propertyKey: keyof T, descriptor: PropertyDescriptor) {
    descriptor.get = function (this: GeometryFactory & { factories: T[] }) {
        return this.factories.some(f => f[propertyKey]);
    }
}

delegate.get = function <T extends GeometryFactory>(target: GeometryFactory & { factories: T[] }, propertyKey: keyof T) {
    Object.defineProperty(target, propertyKey, {
        get() {
            const that = this as GeometryFactory & { factories: T[] };
            const factories = that['factories'] as T[];
            return factories[factories.length - 1][propertyKey];
        }
    })
}
