import { GeometryFactory, AbstractGeometryFactory, ValidationError } from "../../src/commands/GeometryFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import c3d from '../../build/Release/c3d.node';
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import * as THREE from "three";
import { Delay } from "../../src/util/SequentialExecutor";

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

class ReplacingFactory extends AbstractGeometryFactory {
    from!: visual.Solid[]
    to!: c3d.Solid[]

    async calculate() {
        return this.to;
    }

    get originalItem() { return this.from }
    get shouldHideOriginalItemDuringUpdate() { return true }
    get shouldRemoveOriginalItemOnCommit() { return true }
}

describe(AbstractGeometryFactory, () => {
    let sphere1: visual.Solid;
    let sphere2: visual.Solid;
    let replacement1: c3d.Solid;
    let replacement2: c3d.Solid;

    describe('commit', () => {
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
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1];
            replacingFactory.to = [replacement1];

            const newViews = await replacingFactory.commit() as visual.Solid[];
            expect(newViews.length).toBe(1);
            const newView = newViews[0];

            expect(db.visibleObjects.length).toBe(2);
            expect(db.visibleObjects[0]).toBe(sphere2);
            expect(db.visibleObjects[1]).toBe(newView);
        });

        test("when it produces less than it consumes", async () => {
            expect(db.visibleObjects.length).toBe(2);
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1, sphere2];
            replacingFactory.to = [replacement1];

            const newViews = await replacingFactory.commit() as visual.Solid[];
            expect(newViews.length).toBe(1);
            const newView = newViews[0];

            expect(db.visibleObjects.length).toBe(1);
            expect(db.visibleObjects[0]).toBe(newView);
        });

        test("when it produces more than it consumes", async () => {
            expect(db.visibleObjects.length).toBe(2);
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1];
            replacingFactory.to = [replacement1, replacement2];

            const newViews = await replacingFactory.commit() as visual.Solid[];
            expect(newViews.length).toBe(2);
            const newView0 = newViews[0];
            const newView1 = newViews[1];

            expect(db.visibleObjects.length).toBe(3);
            expect(db.visibleObjects[0]).toBe(sphere2);
            expect(db.visibleObjects[1]).toBe(newView0);
            expect(db.visibleObjects[2]).toBe(newView1);
        });
    });

    describe('update & cancel', () => {
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
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1];
            replacingFactory.to = [replacement1];

            await replacingFactory.update();

            expect(db.temporaryObjects.children.length).toBe(1);
            expect(sphere1.visible).toBe(false);

            replacingFactory.cancel();

            expect(db.temporaryObjects.children.length).toBe(0);
            expect(sphere1.visible).toBe(true);
        });

        test("when it produces less than it consumes", async () => {
            expect(db.visibleObjects.length).toBe(2);
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1, sphere2];
            replacingFactory.to = [replacement1];

            await replacingFactory.update();

            expect(db.temporaryObjects.children.length).toBe(1);
            expect(sphere1.visible).toBe(false);
            expect(sphere2.visible).toBe(false);

            replacingFactory.cancel();

            expect(db.temporaryObjects.children.length).toBe(0);
            expect(sphere1.visible).toBe(true);
            expect(sphere2.visible).toBe(true);
        });

        test("when it produces more than it consumes", async () => {
            expect(db.visibleObjects.length).toBe(2);
            expect(db.visibleObjects[0]).toBe(sphere1);
            expect(db.visibleObjects[1]).toBe(sphere2);

            const { view: view1, model: model1 } = db.lookupItemById(sphere1.simpleName);
            expect(view1).toBe(sphere1)

            const replacingFactory = new ReplacingFactory(db, materials, signals);
            replacingFactory.from = [sphere1];
            replacingFactory.to = [replacement1, replacement2];

            await replacingFactory.update();

            expect(db.temporaryObjects.children.length).toBe(2);
            expect(sphere1.visible).toBe(false);

            replacingFactory.cancel();

            expect(db.temporaryObjects.children.length).toBe(0);
            expect(sphere1.visible).toBe(true);
        });
    });
});

class FakeFactory extends GeometryFactory {
    updateCount = 0;
    promises: Promise<void>[] = [];

    get keys() { return ['revertOnError'] }

    revertOnError = 0;

    async calculate() {
        await this.promises[this.updateCount++];

        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(2);
        makeSphere.radius = 1;
        return makeSphere.calculate();
    }
}

type Resolver = (value: void | PromiseLike<void>) => void;

describe(GeometryFactory, () => {
    let factory: FakeFactory;
    let delay1: Delay<void>;
    let delay2: Delay<void>
    let delay3: Delay<void>

    beforeEach(() => {
        factory = new FakeFactory(db, materials, signals);
        delay1 = new Delay();
        delay2 = new Delay();
        delay3 = new Delay();
        factory.promises.push(delay1.promise, delay2.promise, delay3.promise);
    })

    test('does not enqueue multiple updates', async () => {
        const first = factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        delay1.resolve(); delay2.resolve();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("it keeps going if there's an exception", async () => {
        const first = factory.update();
        factory.update();
        delay1.reject("error"); delay2.resolve();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("works serially", async () => {
        const first = factory.update();
        delay1.resolve();
        await first;

        const second = factory.update();
        delay2.resolve();
        await second;

        expect(factory.updateCount).toBe(2);
    });

    test("in case of error, it reverts to last successful parameter & updates", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        delay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();
        delay2.reject("error");
        delay3.resolve();
        await second;

        expect(factory.revertOnError).toBe(1);
        expect(factory.updateCount).toBe(3);
    });

    test("in case of error and cancel, it will not re-update", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        delay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();
        factory.cancel();
        delay2.reject("error");
        delay3.resolve();
        await second;

        expect(factory.revertOnError).toBe(2);
        expect(factory.updateCount).toBe(2);
    });

    test("in case of error and new update, it will not revert the value", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        delay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();

        factory.revertOnError = 3;
        const third = factory.update();

        delay2.reject("error");
        delay3.resolve();
        await second;

        await third;

        expect(factory.revertOnError).toBe(3);
        expect(factory.updateCount).toBe(3);
    });

    test("update swallows validation errors", async () => {
        const first = factory.update();
        delay1.reject(new ValidationError());
        await expect(first).resolves.not.toThrow();

        expect(factory.updateCount).toBe(1);
    });

    test("update swallows c3d errors", async () => {
        const first = factory.update();
        const c3dErr = new Error();
        // @ts-expect-error
        c3dErr.isC3dError = true;
        delay1.reject(c3dErr);
        await expect(first).resolves.not.toThrow();

        expect(factory.updateCount).toBe(1);
    });

    test("in case of long update and cancel", async () => {
        const first = factory.update();
        delay1.resolve();
        await first;

        const second = factory.update();
        factory.cancel();
        delay2.resolve();
        await second;

        expect(db.temporaryObjects.children.length).toBe(0);
    });

    test("in case of long update and commit", async () => {
        const first = factory.update();
        delay1.resolve();
        await first;

        const second = factory.update();
        
        const third = factory.commit();
        delay3.resolve();
        await third;

        delay2.resolve();
        await second;
    });

    test("in case of long update that errors and commit", async () => {
        const first = factory.update();
        delay1.resolve();
        await first;

        const second = factory.update();

        const third = factory.commit();
        delay3.resolve();
        await third;

        delay2.reject("failure");
        await second;

        expect(db.temporaryObjects.children.length).toBe(0);
    });
})