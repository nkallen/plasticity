import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../src/commands/box/BoxFactory";
import FilletFactory from "../src/commands/fillet/FilletFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { BasicMeshCreator, DoCacheMeshCreator, FaceCacheMeshCreator, ObjectCacheMeshCreator, ParallelMeshCreator } from "../src/editor/MeshCreator";
import { SolidCopier } from "../src/editor/SolidCopier";
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let db: GeometryDatabase;
let signals: EditorSignals;

let makeSphere: SphereFactory;
let makeBox: ThreePointBoxFactory;
let makeFillet: FilletFactory;
let copier: SolidCopier;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    copier = new SolidCopier();
    db = new GeometryDatabase(new ParallelMeshCreator(), copier, materials, signals);
    makeFillet = new FilletFactory(db, materials, signals);
})

beforeEach(() => {
    makeSphere = new SphereFactory(db, materials, signals);
    makeBox = new ThreePointBoxFactory(db, materials, signals);
})

const formNote = new c3d.FormNote(true, true, false, false, false);
const stepData = new c3d.StepData(c3d.StepType.SpaceStep, 0.25);

describe(ParallelMeshCreator, () => {
    let parallel: ParallelMeshCreator;
    let basic: BasicMeshCreator;

    beforeEach(() => {
        parallel = new ParallelMeshCreator();
        basic = new BasicMeshCreator();
    });

    describe('parallel and basic have identical output', () => {
        test('sphere', async () => {
            makeSphere.center = new THREE.Vector3();
            makeSphere.radius = 1;
            const item = await makeSphere.calculate() as c3d.Solid;

            const { edges: edgesParallel, faces: facesParallel } = await parallel.create(item, stepData, formNote, true, true);
            const { faces: facesBasic } = await basic.create(item, stepData, formNote, true, true);

            expect(edgesParallel.length).toBe(0);
            expect(facesParallel.length).toBe(1);

            expect(facesParallel[0].position).toEqual(facesBasic[0].position);
            expect(facesParallel[0].normal).toEqual(facesBasic[0].normal);
            expect(facesParallel[0].index).toEqual(facesBasic[0].index);
        })

        test.only('box', async () => {
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);

            const item = await makeBox.calculate() as c3d.Solid;

            const { edges: edgesParallel, faces: facesParallel } = await parallel.create(item, stepData, formNote, true, true);
            const { faces: facesBasic } = await basic.create(item, stepData, formNote, true, true);

            expect(edgesParallel.length).toBe(12);
            expect(facesParallel.length).toBe(6);

            expect(facesParallel[0].position).toEqual(facesBasic[0].position);
            expect(facesParallel[0].normal).toEqual(facesBasic[0].normal);
            expect(facesParallel[0].index).toEqual(facesBasic[0].index);
        })
    })
});

describe(ObjectCacheMeshCreator, () => {
    let calculateGrid: jest.SpyInstance;

    beforeEach(() => {
        calculateGrid = jest.spyOn(c3d.TriFace, 'CalculateGrid_async');
    })

    let cache: ObjectCacheMeshCreator;
    let underlying: ParallelMeshCreator;

    beforeEach(() => {
        underlying = new ParallelMeshCreator();
        cache = new ObjectCacheMeshCreator(underlying);
    });

    beforeEach(() => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
    })

    let item: c3d.Solid;
    beforeEach(async () => {
        item = await makeBox.calculate() as c3d.Solid;
    })

    test('with cache, object hit', async () => {
        const { edges: edges1, faces: faces1 } = await cache.create(item, stepData, formNote, true, true);
        expect(calculateGrid).toBeCalledTimes(6);
        calculateGrid.mockClear();

        const { edges: edges2, faces: faces2 } = await cache.create(item, stepData, formNote, true, true);
        expect(calculateGrid).toBeCalledTimes(0);

        expect(faces1).toBe(faces2);
        expect(edges1).toBe(edges2);
    });

    test('with cache, object hit but different precisions', async () => {
        const { edges: edges1, faces: faces1 } = await cache.create(item, stepData, formNote, true, true);
        expect(calculateGrid).toBeCalledTimes(6);
        calculateGrid.mockClear();

        const stepData2 = new c3d.StepData(c3d.StepType.SpaceStep, 0.5);
        const { edges: edges2, faces: faces2 } = await cache.create(item, stepData2, formNote, true, true);
        expect(calculateGrid).toBeCalledTimes(6);

        expect(faces1).not.toBe(faces2);
        expect(edges1).not.toBe(edges2);
    });
});

describe(FaceCacheMeshCreator, () => {
    let calculateGrid: jest.SpyInstance;

    beforeEach(() => {
        calculateGrid = jest.spyOn(c3d.TriFace, 'CalculateGrid_async');
    })

    let cache: FaceCacheMeshCreator;
    beforeEach(() => {
        cache = new FaceCacheMeshCreator(new ParallelMeshCreator(), copier);
        db = new GeometryDatabase(cache, copier, materials, signals);
        makeFillet = new FilletFactory(db, materials, signals);
    })

    let box: visual.Solid;
    let item1: c3d.Solid, item2: c3d.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        calculateGrid.mockClear();
    })

    test('with cache face hit', async () => {
        await copier.caching(async () => {
            makeFillet.solid = box;
            makeFillet.edges = [box.edges.get(0)];
            makeFillet.distance = 0.1;
            item1 = await makeFillet.calculate();

            makeFillet.solid = box;
            makeFillet.edges = [box.edges.get(0)];
            makeFillet.distance = 0.15;
            item2 = await makeFillet.calculate();

            await cache.create(item1, stepData, formNote, true, false);
            expect(calculateGrid).toBeCalledTimes(7);
            calculateGrid.mockClear();

            await cache.create(item2, stepData, formNote, true, false);
            expect(calculateGrid).toBeCalledTimes(5);
        });
    });

    test('with face history not populated', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [box.edges.get(0)];
        makeFillet.distance = 0.1;
        item1 = await makeFillet.calculate();

        makeFillet.solid = box;
        makeFillet.edges = [box.edges.get(0)];
        makeFillet.distance = 0.15;
        item2 = await makeFillet.calculate();

        await cache.create(item1, stepData, formNote, true, false);
        expect(calculateGrid).toBeCalledTimes(7);
        calculateGrid.mockClear();

        await cache.create(item2, stepData, formNote, true, false);
        expect(calculateGrid).toBeCalledTimes(7);
    });

    test('when includemetdata=true, indices are correct', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [box.edges.get(0)];
        makeFillet.distance = 0.1;
        item1 = await makeFillet.calculate();

        const result = await cache.create(item1, stepData, formNote, true, true);
        expect(result.edges.length).toBe(15);
        for (let i = 0; i < result.edges.length; i++) {
            const edge = result.edges[i];
            expect(edge.i).toBe(i);
        }
        expect(result.faces.length).toBe(7);
        for (let i = 0; i < result.faces.length; i++) {
            const face = result.faces[i];
            expect(face.i).toBe(i);
        }
    });
})

describe(DoCacheMeshCreator, () => {
    let calculateGrid: jest.SpyInstance;

    beforeEach(() => {
        calculateGrid = jest.spyOn(c3d.TriFace, 'CalculateGrid_async');
    })

    let cache: DoCacheMeshCreator;
    let underlying: ParallelMeshCreator;
    beforeEach(() => {
        cache = new DoCacheMeshCreator(new ParallelMeshCreator(), copier);
        underlying = new ParallelMeshCreator();
        db = new GeometryDatabase(cache, copier, materials, signals);
        makeFillet = new FilletFactory(db, materials, signals);
    })

    let box: visual.Solid;
    let item1: c3d.Solid, item2: c3d.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        calculateGrid.mockClear();
    })

    test('with cache turned off', async () => {
        makeFillet.solid = box;
        makeFillet.edges = [box.edges.get(0)];
        makeFillet.distance = 0.1;
        item1 = await makeFillet.calculate();

        makeFillet.solid = box;
        makeFillet.edges = [box.edges.get(0)];
        makeFillet.distance = 0.15;
        item2 = await makeFillet.calculate();

        await cache.create(item1, stepData, formNote, true, false);
        expect(calculateGrid).toBeCalledTimes(7);
        calculateGrid.mockClear();

        await cache.create(item2, stepData, formNote, true, false);
        expect(calculateGrid).toBeCalledTimes(7);
    });

    test('with cache turned on', async () => {
        await copier.caching(async () => {
            await cache.caching(async () => {
                makeFillet.solid = box;
                makeFillet.edges = [box.edges.get(0)];
                makeFillet.distance = 0.1;
                item1 = await makeFillet.calculate();

                makeFillet.solid = box;
                makeFillet.edges = [box.edges.get(0)];
                makeFillet.distance = 0.15;
                item2 = await makeFillet.calculate();

                await cache.create(item1, stepData, formNote, true, false);
                expect(calculateGrid).toBeCalledTimes(7);
                calculateGrid.mockClear();

                await cache.create(item2, stepData, formNote, true, false);
                expect(calculateGrid).toBeCalledTimes(5);
            });
        })
    })
})