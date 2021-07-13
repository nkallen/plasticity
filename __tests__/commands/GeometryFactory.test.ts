import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';
import * as visual from '../../src/VisualModel';
import { GeometryFactory } from "../../src/commands/Factory";

class FakeFactory extends GeometryFactory {
    updateCount = 0;
    promises: Promise<void>[] = [];

    protected async doUpdate() {
        return this.promises[this.updateCount++];
    }

    protected async doCommit(): Promise<visual.SpaceItem | visual.SpaceItem[]> {
        throw new Error("Method not implemented.");
    }
    protected doCancel(): void {
        throw new Error("Method not implemented.");
    }
}

let db: GeometryDatabase;
let factory: FakeFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    factory = new FakeFactory(db, materials, signals);
})

describe('update', () => {
    test('simple update', async () => {
        factory.promises.push(Promise.resolve());
        await factory.update();
        expect(factory.updateCount).toBe(1);
    })


    test('does not enqueue multiple updates', async () => {
        let resolve1, resolve2;
        factory.promises.push(new Promise<void>((resolve, _) => { resolve1 = resolve }));
        factory.promises.push(new Promise<void>((resolve, _) => { resolve2 = resolve }));

        const first = factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        resolve1(); resolve2();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("it keeps going if there's an exception", async () => {
        let reject1, resolve2;
        factory.promises.push(new Promise<void>((_, reject) => { reject1 = reject }));
        factory.promises.push(new Promise<void>((resolve, _) => { resolve2 = resolve }));

        const first = factory.update();
        factory.update();
        reject1("error"); resolve2();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("works serially", async () => {
        let resolve;
        factory.promises.push(new Promise<void>((resolve_, _) => { resolve = resolve_ }));
        const first = factory.update();
        resolve();
        await first;

        factory.promises.push(new Promise<void>((resolve_, _) => { resolve = resolve_ }));
        const second = factory.update();
        resolve();
        await second;

        expect(factory.updateCount).toBe(2);
    });
})