import { MultiGeometryFactory, MultiplyableFactory } from './MultiFactory';

export function delegate(initial?: number) {
    return function <T extends MultiplyableFactory>(target: MultiGeometryFactory<T>, propertyKey: keyof T) {
        let value: any = initial;
        Object.defineProperty(target, propertyKey, {
            get() { return value },
            set(t: any) {
                value = t;
                const that = this as MultiGeometryFactory<T>;
                const individuals = that['individuals'] as MultiGeometryFactory<T>['individuals'];
                individuals.forEach(i => i[propertyKey] = t);
            }
        })
    }
}