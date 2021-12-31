import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import FilletFactory, { Max, MaxFilletFactory, MultiFilletFactory } from "../../src/commands/fillet/FilletFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let makeBox: ThreePointBoxFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeBox = new ThreePointBoxFactory(db, materials, signals);
})

describe(FilletFactory, () => {
    let makeFillet: FilletFactory;

    beforeEach(() => {
        makeFillet = new FilletFactory(db, materials, signals);
    })

    test('positive distance', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        await makeFillet.commit();

        expect(makeFillet.mode).toBe(c3d.CreatorType.FilletSolid);
    })

    test('negative distance', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = -0.1;
        await makeFillet.commit();

        expect(makeFillet.mode).toBe(c3d.CreatorType.ChamferSolid);
    })
});

describe(MaxFilletFactory, () => {
    let makeFillet: MaxFilletFactory;

    beforeEach(() => {
        makeFillet = new MaxFilletFactory(db, materials, signals);
    })

    test('distance within range', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;

        await makeFillet.commit();
    });

    test('distance > max', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        await makeFillet.start();

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 100;

        await makeFillet.commit();
    })
});

describe(Max, () => {
    let makeFillet: FilletFactory;
    let max: Max<any>;

    beforeEach(() => {
        makeFillet = new FilletFactory(db, materials, signals);
        max = new Max(makeFillet);
    })

    beforeEach(async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);
        makeFillet.solid = box;
        makeFillet.edges = [edge];
    });

    test('computes max viable fillet', async () => {
        const result = await max.start();
        expect(result).toBeCloseTo(1, 1);
    });

    test('truncates larger fillet values', async () => {
        const fn = jest.fn();

        // no max has yet been found, so it invokes callback
        await max.exec(1000, fn);
        expect(fn).toBeCalledTimes(1);
        expect(fn.mock.calls[0][0]).toBe(1000);

        await max.start();

        // invokes callback with truncated value
        await max.exec(1000, fn);
        expect(fn).toBeCalledTimes(2);
        expect(fn.mock.calls[1][0]).toBeCloseTo(1, 1);

        // skips work, since we already computed max
        await max.exec(1000, fn);
        expect(fn).toBeCalledTimes(2);

        // recomputes since we have a new valid value
        await max.exec(0.5, fn);
        expect(fn).toBeCalledTimes(3);
        expect(fn.mock.calls[2][0]).toBeCloseTo(0.5);

        // recomputes since we have a new valid value
        await max.exec(1000, fn);
        expect(fn).toBeCalledTimes(4);
    })
})

describe(MultiFilletFactory, () => {
    let box1: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box1 = await makeBox.commit() as visual.Solid;
    })

    let box2: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3(10, 10, 0);
        makeBox.p2 = new THREE.Vector3(11, 0, 0);
        makeBox.p3 = new THREE.Vector3(11, 11, 0);
        makeBox.p4 = new THREE.Vector3(11, 11, 1);
        box2 = await makeBox.commit() as visual.Solid;
    })

    it('works', async () => {
        const multi = new MultiFilletFactory(db, materials, signals);
        multi.edges = [box1.edges.get(0), box2.edges.get(0)];
        multi.distance = 1;
        const result = await multi.commit() as visual.Solid[];
        expect(result.length).toBe(2);
    })
})