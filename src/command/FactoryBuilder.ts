import { GeometryFactory } from './GeometryFactory';
import * as visual from '../visual_model/VisualModel';
import c3d from '../../build/Release/c3d.node';

export function delegate<T extends GeometryFactory>(target: GeometryFactory & { factories: T[] }, propertyKey: keyof T) {
    const privatePropertyKey = '_' + propertyKey;
    Object.defineProperty(target, privatePropertyKey, { value: undefined, writable: true })
    Object.defineProperty(target, propertyKey, {
        get() { return this[privatePropertyKey] },
        set(t: any) {
            this[privatePropertyKey] = t;
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

type Derivable = typeof visual.Solid | typeof visual.Face;

export function derive<T extends Derivable>(type: T) {
    return function <T extends GeometryFactory>(target: T, propertyKey: keyof T, descriptor: PropertyDescriptor) {
        descriptor.get = function (this: GeometryFactory) {
            // @ts-ignore
            return this['_' + propertyKey].view;
        }
        switch (type) {
            case visual.Solid:
                descriptor.set = function (this: GeometryFactory, t: any) {
                    const value: { view?: visual.Solid, model?: c3d.Solid } = {};
                    if (t instanceof c3d.Solid) value.model = t;
                    else {
                        value.view = t;
                        value.model = this.db.lookup(t);
                    }
                    // @ts-ignore
                    this['_' + propertyKey] = value;
                }
                break;
            case visual.Face:
                descriptor.set = function (this: GeometryFactory, t: any) {
                    const value: { view?: visual.Face, model?: c3d.Face } = {};
                    if (t instanceof c3d.Face) value.model = t;
                    else {
                        value.view = t;
                        value.model = this.db.lookupTopologyItem(t);
                    }
                    // @ts-ignore
                    this['_' + propertyKey] = value;
                }
                break;
        }
        Object.defineProperty(target, '_' + propertyKey, { value: {}, writable: true });
    }
}