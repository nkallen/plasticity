import { GeometryFactory, ValidationError } from "../../src/commands/GeometryFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import c3d from '../../build/Release/c3d.node';
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import * as THREE from "three";

class FakeFactory extends GeometryFactory {
    updateCount = 0;
    promises: Promise<void>[] = [];

    get keys() { return ['revertOnError'] }

    revertOnError = 0;

    async calculate() {
        return this.promises[this.updateCount++] as unknown as c3d.Item | c3d.Item[];
    }
}

let db: GeometryDatabase;
let factory: FakeFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
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
        let resolve1: (value: void | PromiseLike<void>) => void, resolve2: (value: void | PromiseLike<void>) => void;
        factory.promises.push(new Promise<void>((resolve, _) => { resolve1 = resolve }));
        factory.promises.push(new Promise<void>((resolve, _) => { resolve2 = resolve }));

        const first = factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        resolve1!(); resolve2!();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("it keeps going if there's an exception", async () => {
        let reject1: (reason?: any) => void, resolve2: (value: void | PromiseLike<void>) => void;
        factory.promises.push(new Promise<void>((_, reject) => { reject1 = reject }));
        factory.promises.push(new Promise<void>((resolve, _) => { resolve2 = resolve }));

        const first = factory.update();
        factory.update();
        reject1!("error"); resolve2!();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("works serially", async () => {
        let resolve: (value: void | PromiseLike<void>) => void;
        factory.promises.push(new Promise<void>((resolve_, _) => { resolve = resolve_ }));
        const first = factory.update();
        resolve!();
        await first;

        factory.promises.push(new Promise<void>((resolve_, _) => { resolve = resolve_ }));
        const second = factory.update();
        resolve!();
        await second;

        expect(factory.updateCount).toBe(2);
    });

    test("in case of error, it reverts to last successful parameter", async () => {
        let resolve1: (value: void | PromiseLike<void>) => void, reject2: (reason?: any) => void;
        factory.revertOnError = 1;
        factory.promises.push(new Promise<void>((resolve_, _) => { resolve1 = resolve_ }));
        const first = factory.update();
        resolve1!();
        await first;

        factory.revertOnError = 2;
        factory.promises.push(new Promise<void>((_, reject_) => { reject2 = reject_ }));
        const second = factory.update();
        reject2!("error");
        await second;

        expect(factory.revertOnError).toBe(1);
        expect(factory.updateCount).toBe(3);
    });

    test("update swallows validation errors", async () => {
        let reject: (reason?: any) => void;
        factory.promises.push(new Promise<void>((_, reject_) => { reject = reject_ }));

        const first = factory.update();
        reject!(new ValidationError());
        await first;

        expect(factory.updateCount).toBe(1);
    });


    test("update swallows c3d errors", async () => {
        let reject: (reason?: any) => void;
        factory.promises.push(new Promise<void>((_, reject_) => { reject = reject_ }));

        const first = factory.update();
        const c3dErr = new Error();
        // @ts-expect-error
        c3dErr.isC3dError = true;
        reject!(c3dErr);
        await first;

        expect(factory.updateCount).toBe(1);
    });
})

class ReplacingFactory extends GeometryFactory {
    from!: visual.Solid[]
    to!: c3d.Solid[]

    async calculate() {
        return this.to;
    }

    get originalItem() { return this.from }
}

describe("commit", () => {
    let sphere1: visual.Solid;
    let sphere2: visual.Solid;
    let replacement1: c3d.Solid;
    let replacement2: c3d.Solid;

    beforeEach(async () => {
        const makeSphere1 = new SphereFactory(db, materials, signals);
        makeSphere1.center = new THREE.Vector3();
        makeSphere1.radius = 1;
        sphere1 = await makeSphere1.commit() as visual.Solid;

        const makeSphere2 = new SphereFactory(db, materials, signals);
        makeSphere2.center = new THREE.Vector3(1);
        makeSphere2.radius = 1;
        sphere2 = await makeSphere2.commit() as visual.Solid;

        const makeSphere3 = new SphereFactory(db, materials, signals);
        makeSphere3.center = new THREE.Vector3(2);
        makeSphere3.radius = 1;
        replacement1 = await makeSphere3.calculate() as c3d.Solid;

        const makeSphere4 = new SphereFactory(db, materials, signals);
        makeSphere4.center = new THREE.Vector3(3);
        makeSphere4.radius = 1;
        replacement2 = await makeSphere4.calculate() as c3d.Solid;
    });

    test("it replaces the original item", async () => {
        expect(db.visibleObjects.length).toBe(2);

        const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
        expect(view1).toBe(sphere1)

        const replacingFactory = new ReplacingFactory(db, materials, signals);
        replacingFactory.from = [sphere1];
        replacingFactory.to = [replacement1];

        const newViews = await replacingFactory.commit() as visual.Solid[];
        const newView = newViews[0];
        expect(db.visibleObjects.length).toBe(2);

        const { view: view2, model: model2 } = db.lookupItemById(sphere1.simpleName);
        expect(view2.uuid).toBe(newView.uuid)
    });

    test("when it produces less than it consumes", async () => {
        expect(db.visibleObjects.length).toBe(2);

        const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
        expect(view1).toBe(sphere1)

        const replacingFactory = new ReplacingFactory(db, materials, signals);
        replacingFactory.from = [sphere1, sphere2];
        replacingFactory.to = [replacement1];

        const newViews = await replacingFactory.commit() as visual.Solid[];
        const newView = newViews[0];
        expect(db.visibleObjects.length).toBe(1);

        const { view: view2, model: model2 } = db.lookupItemById(sphere1.simpleName);
        expect(view2.uuid).toBe(newView.uuid)
    });

    test("when it produces more than it consumes", async () => {
        expect(db.visibleObjects.length).toBe(2);

        const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
        expect(view1).toBe(sphere1)

        const replacingFactory = new ReplacingFactory(db, materials, signals);
        replacingFactory.from = [sphere1];
        replacingFactory.to = [replacement1, replacement2];

        const newViews = await replacingFactory.commit() as visual.Solid[];
        const newView = newViews[0];
        expect(db.visibleObjects.length).toBe(3);

        const { view: view2, model: model2 } = db.lookupItemById(sphere1.simpleName);
        expect(view2.uuid).toBe(newView.uuid)
    });
});