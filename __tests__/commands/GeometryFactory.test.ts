import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { AbstractGeometryFactory, GeometryFactory, PhantomInfo, ValidationError } from "../../src/command/GeometryFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase, TemporaryObject } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Delay } from "../../src/util/SequentialExecutor";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

let sphere: c3d.Solid;
beforeEach(async () => {
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3(2);
    makeSphere.radius = 1;
    sphere = await makeSphere.calculate() as c3d.Solid;
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

    describe('doCommit', () => {
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
    calcPromises: Promise<void>[] = [];
    phantPromises: Promise<void>[] = [];

    get keys() { return ['revertOnError'] }

    revertOnError = 0;

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        await this.phantPromises[this.updateCount];

        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(2);
        makeSphere.radius = 1;
        const phantom = await makeSphere.calculate();
        return [{ phantom, material: {} }]
    }

    async calculate() {
        await this.calcPromises[this.updateCount++];

        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(2);
        makeSphere.radius = 1;
        return makeSphere.calculate();
    }
}

describe(GeometryFactory, () => {
    let factory: FakeFactory;
    let calcDelay1: Delay<void>;
    let calcDelay2: Delay<void>
    let calcDelay3: Delay<void>
    let phantDelay1: Delay<void>;
    let phantDelay2: Delay<void>
    let phantDelay3: Delay<void>

    beforeEach(() => {
        factory = new FakeFactory(db, materials, signals);
        calcDelay1 = new Delay(); calcDelay2 = new Delay(); calcDelay3 = new Delay();
        phantDelay1 = new Delay(); phantDelay2 = new Delay(); phantDelay3 = new Delay();
        factory.calcPromises.push(calcDelay1.promise, calcDelay2.promise, calcDelay3.promise);
        factory.phantPromises.push(phantDelay1.promise, phantDelay2.promise, phantDelay3.promise);
    })

    test('does not enqueue multiple updates', async () => {
        const first = factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        factory.update();
        calcDelay1.resolve(); calcDelay2.resolve();
        phantDelay1.resolve(); phantDelay2.resolve();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("it keeps going if there's an exception", async () => {
        const first = factory.update();
        factory.update();
        calcDelay1.reject("error"); phantDelay1.resolve();
        calcDelay2.resolve(); phantDelay2.resolve();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("works serially", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        const second = factory.update();
        calcDelay2.resolve(); phantDelay2.resolve();
        await second;

        expect(factory.updateCount).toBe(2);
    });

    test("in case of error, it reverts to last successful parameter & updates", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();
        calcDelay2.reject("error"); phantDelay2.resolve();
        calcDelay3.resolve(); phantDelay3.resolve();
        await second;

        expect(factory.revertOnError).toBe(1);
        expect(factory.updateCount).toBe(3);
    });

    test("in case of error and cancel, it will not re-update", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();
        factory.cancel();
        calcDelay2.reject("error"); phantDelay2.resolve();
        calcDelay3.resolve();
        await second;

        expect(factory.revertOnError).toBe(2);
        expect(factory.updateCount).toBe(2);
    });

    test("in case of error and new update, it will not revert the value", async () => {
        factory.revertOnError = 1;
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        factory.revertOnError = 2;
        const second = factory.update();

        factory.revertOnError = 3;
        const third = factory.update();

        calcDelay2.reject("error"); phantDelay1.resolve();
        calcDelay3.resolve(); phantDelay3.resolve();
        await second;

        await third;

        expect(factory.revertOnError).toBe(3);
        expect(factory.updateCount).toBe(3);
    });

    test("update swallows validation errors", async () => {
        const first = factory.update();
        calcDelay1.reject(new ValidationError()); phantDelay1.resolve();
        await expect(first).resolves.not.toThrow();

        expect(factory.updateCount).toBe(1);
    });

    test("update swallows c3d errors", async () => {
        const first = factory.update();
        const c3dErr = new Error();
        // @ts-expect-error
        c3dErr.isC3dError = true;
        calcDelay1.reject(c3dErr);
        await expect(first).resolves.not.toThrow();

        expect(factory.updateCount).toBe(1);
    });

    test("in case of an erroring phantom, it keeps going", async () => {
        const first = factory.update();
        factory.update();
        calcDelay1.resolve(); phantDelay1.reject();
        calcDelay2.resolve(); phantDelay2.resolve();
        await first;
        expect(factory.updateCount).toBe(2);
    });

    test("phantoms create a temporary object", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;
        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.phantomObjects.children.length).toBe(1);
    });


    test("in case of a long update and a fast phantom", async () => {
        const show = jest.fn(), cancel = jest.fn();
        jest.spyOn(db, 'addTemporaryItem').mockImplementation(() => {
            return Promise.resolve({ show, cancel, underlying: new THREE.Object3D } as unknown as TemporaryObject);
        })

        phantDelay1.resolve();
        const first = factory.update();

        phantDelay2.resolve();
        const second = factory.update();

        phantDelay3.resolve();
        const third = factory.update();

        calcDelay1.resolve(); calcDelay2.resolve(); calcDelay3.resolve();
        await first;
        await second;
        await third;

        expect(show).toBeCalledTimes(4);
        expect(cancel).toBeCalledTimes(2);
    });

    test("in case of long update and cancel", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.phantomObjects.children.length).toBe(1);

        const second = factory.update();
        factory.cancel();
        calcDelay2.resolve(); phantDelay2.resolve();
        await second;

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.phantomObjects.children.length).toBe(0);
    });

    test("in case of long update and commit", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.phantomObjects.children.length).toBe(1);

        const second = factory.update();

        const third = factory.commit();
        calcDelay3.resolve(); phantDelay3.resolve();
        await third;

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.phantomObjects.children.length).toBe(0);

        calcDelay2.resolve(); phantDelay2.resolve();
        await second;

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.phantomObjects.children.length).toBe(0);
    });

    test("in case of long update and long temporary object rendering AND commit", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        const second = factory.update();

        const delay4 = new Delay<TemporaryObject>();
        jest.spyOn(db, 'addTemporaryItem').mockImplementationOnce(() => {
            return delay4.promise;
        });

        calcDelay2.resolve(); phantDelay2.resolve();

        const third = factory.commit();
        calcDelay3.resolve(); phantDelay3.resolve();
        await third;

        const show = jest.fn();
        const cancel = jest.fn();
        delay4.resolve({
            show: show,
            cancel: cancel
        } as unknown as TemporaryObject);
        await second;

        expect(show).toBeCalledTimes(0);
        expect(cancel).toBeCalledTimes(1);
    });

    test("in case of long update that errors and commit", async () => {
        const first = factory.update();
        calcDelay1.resolve(); phantDelay1.resolve();
        await first;

        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.phantomObjects.children.length).toBe(1);

        const second = factory.update();

        const third = factory.commit();
        calcDelay3.resolve(); phantDelay3.resolve();
        await third;

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.phantomObjects.children.length).toBe(0);

        calcDelay2.reject("failure"); phantDelay2.resolve();
        await second;

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.phantomObjects.children.length).toBe(0);
    });
})