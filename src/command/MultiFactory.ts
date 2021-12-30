import * as visual from "../visual_model/VisualModel";
import { GeometryFactory, PhantomInfo } from "./GeometryFactory";

export interface FactoryHelpers {
    get phantoms(): PhantomInfo[];
    get originalItem(): visual.Item | visual.Item[] | undefined;
}

export type MultiplyableFactory = GeometryFactory & FactoryHelpers;

export class MultiGeometryFactory<T extends MultiplyableFactory> extends GeometryFactory {
    protected individuals!: T[];

    async calculate() {
        const { individuals } = this;
        const result = [];
        for (const individual of individuals) {
            result.push(individual.calculate());
        }
        return (await Promise.all(result)).flat();
    }

    protected get phantoms(): PhantomInfo[] {
        return this.individuals.map(i => i.phantoms).flat();
    }

    protected get originalItem(): visual.Item[] {
        let result: visual.Item[] = [];
        for (const i of this.individuals) {
            const original = i.originalItem;
            if (original === undefined) continue;
            else if (original instanceof visual.Item) result.push(original);
            else result = result.concat(original);
        }
        return result;
    }
}

export function groupBy<K extends keyof O, O>(property: K, objects: O[]) {
    const map = new Map<O[K], O[]>();
    for (const obj of objects) {
        const key = obj[property];
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(obj);
    }
    return map;
}