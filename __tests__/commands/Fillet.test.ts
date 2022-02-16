import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import FilletFactory, { Max, MaxFilletFactory, MultiFilletFactory } from "../../src/commands/fillet/FilletFactory";
import { FunctionWrapper } from "../../src/commands/fillet/FunctionWrapper";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
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
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    makeBox = new ThreePointBoxFactory(db, materials, signals);
})

describe(FilletFactory, () => {
    let makeFillet: FilletFactory;

    beforeEach(() => {
        makeFillet = new FilletFactory(db, materials, signals);
    })

    let box: visual.Solid;
    beforeEach(async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    })


    test('positive distance', async () => {
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        await makeFillet.commit();

        expect(makeFillet.mode).toBe(c3d.CreatorType.FilletSolid);
    })

    test('negative distance', async () => {
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = -0.1;
        await makeFillet.commit();

        expect(makeFillet.mode).toBe(c3d.CreatorType.ChamferSolid);
    })

    test('variable fillet', async () => {
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        const fn = makeFillet.functions.get(edge.simpleName)!;
        fn.InsertValue(1, 10);
        const result = await makeFillet.commit() as visual.Item;

        const bbox = new THREE.Box3();
        bbox.setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});

describe(MaxFilletFactory, () => {
    let makeFillet: MaxFilletFactory;

    beforeEach(() => {
        makeFillet = new MaxFilletFactory(db, materials, signals);
    })

    let box: visual.Solid;
    let edge: visual.CurveEdge;
    beforeEach(async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        edge = box.edges.get(0);
    })

    test('distance within range', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [edge];

        const result = await makeFillet.start();
        expect(result).toBeCloseTo(1, 1);

        makeFillet.distance = 0.1;

        await makeFillet.commit();
    });

    test('distance > max', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [edge];

        const result = await makeFillet.start();
        expect(result).toBeCloseTo(1, 1);

        makeFillet.distance = 100;
        await expect(makeFillet.commit()).resolves.not.toThrow();
    })

    test('distance1 != distance2', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [edge];

        const result = await makeFillet.start();
        expect(result).toBeCloseTo(1, 1);

        makeFillet.distance1 = 100;
        makeFillet.distance2 = 200;
        await expect(makeFillet.commit()).rejects.toThrow();
    })

    test('dirty', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [edge];

        const result = await makeFillet.start();
        expect(result).toBeCloseTo(1, 1);

        makeFillet.form = c3d.SmoothForm.Span;

        makeFillet.distance = 100;
        await expect(makeFillet.commit()).rejects.toThrow();
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
        await max.exec(1000, 1000, fn);
        expect(fn).toBeCalledTimes(1);
        expect(fn.mock.calls[0][0]).toBe(1000);

        const result = await max.start();
        expect(result).toBeCloseTo(1, 1);

        // invokes callback with truncated value
        await max.exec(1000, 1000, fn);
        expect(fn).toBeCalledTimes(1);

        // skips work, since we already computed max
        await max.exec(1000, 1000, fn);
        expect(fn).toBeCalledTimes(1);

        // recomputes since we have a valid value < max
        await max.exec(0.5, 0.5, fn);
        expect(fn).toBeCalledTimes(2);
        expect(fn.mock.calls[1][0]).toBeCloseTo(0.5);

        // still stores the old max
        await max.exec(1000, 1000, fn);
        expect(fn).toBeCalledTimes(2);
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

    it('distance* before object is set', async () => {
        const multi = new MultiFilletFactory(db, materials, signals);
        expect(multi.distance).toBe(0)
        expect(multi.distance1).toBe(0)
        expect(multi.distance2).toBe(0)
    })

    it('using distance (not distance1 or distance2) uses the optimization', async () => {
        const multi = new MultiFilletFactory(db, materials, signals);
        multi.edges = [box1.edges.get(0), box2.edges.get(0)];
        expect(multi.factories.length).toBe(2);
        const [f1, f2] = multi.factories;
        const max = await multi.start();
        expect(max[0]).toBeCloseTo(1, 1);
        expect(max[1]).toBeCloseTo(50.56, 1);
        const f1_calculate = jest.spyOn(f1, 'calculate');
        const f2_calculate = jest.spyOn(f2, 'calculate');
        multi.distance = 1000;
        expect(multi.distance1).toBeCloseTo(50.56, 1);
        expect(multi.distance2).toBeCloseTo(50.56, 1);
        const result = await multi.commit() as visual.Solid[];
        expect(result.length).toBe(2);
        expect(f1_calculate).toBeCalledTimes(1);
        expect(f2_calculate).toBeCalledTimes(1);
    })
})

describe(FunctionWrapper, () => {
    test('it makes a json', () => {
        const underlying = new c3d.CubicFunction(1, 1);
        const wrapper = new FunctionWrapper(underlying);
        wrapper.InsertValue(0, 2);
        expect(wrapper.toJSON()).toEqual({ t: 0, value: 2 });
    })

    let makeFillet: FilletFactory;

    beforeEach(() => {
        makeFillet = new FilletFactory(db, materials, signals);
    })

    test('is reflected in the fillet json', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.solid = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        const fn = makeFillet.functions.get(edge.simpleName)!;
        fn.InsertValue(1, 10);
        expect(makeFillet.toJSON().fns).toEqual([{ t: 1, value: 10 }]);
        await makeFillet.commit();
    })
});