import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../src/commands/box/BoxFactory";
import FilletFactory from "../src/commands/fillet/FilletFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { BasicMeshCreator, ParallelMeshCreator } from "../src/editor/MeshCreator";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import * as visual from '../src/visual_model/VisualModel';

let materials: MaterialDatabase;
let db: GeometryDatabase;
let signals: EditorSignals;

let makeSphere: SphereFactory;
let makeBox: ThreePointBoxFactory;
let makeFillet: FilletFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    makeFillet = new FilletFactory(db, materials, signals);
})

beforeEach(() => {
    makeSphere = new SphereFactory(db, materials, signals);
    makeBox = new ThreePointBoxFactory(db, materials, signals);
})

describe(ParallelMeshCreator, () => {
    let parallel: ParallelMeshCreator;
    let basic: BasicMeshCreator;

    const formNote = new c3d.FormNote(true, true, false, false, false);
    const stepData = new c3d.StepData(c3d.StepType.SpaceStep, 0.25);

    beforeEach(() => {
        parallel = new ParallelMeshCreator();
        basic = new BasicMeshCreator();
    });

    describe('parallel and basic have identical output', () => {
        test('sphere', async () => {
            makeSphere.center = new THREE.Vector3();
            makeSphere.radius = 1;
            const item = await makeSphere.calculate() as c3d.Solid;

            const { edges: edgesParallel, faces: facesParallel } = await parallel.create(item, stepData, formNote, true);
            const { edges: edgesBasic, faces: facesBasic } = await basic.create(item, stepData, formNote, true);

            expect(edgesParallel.length).toBe(0);
            expect(facesParallel.length).toBe(1);

            expect(facesParallel[0].position).toEqual(facesBasic[0].position);
            expect(facesParallel[0].normal).toEqual(facesBasic[0].normal);
            expect(facesParallel[0].index).toEqual(facesBasic[0].index);
        })

        test('box', async () => {
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);

            const item = await makeBox.calculate() as c3d.Solid;

            const { edges: edgesParallel, faces: facesParallel } = await parallel.create(item, stepData, formNote, true);
            const { edges: edgesBasic, faces: facesBasic } = await basic.create(item, stepData, formNote, true);

            expect(edgesParallel.length).toBe(12);
            expect(facesParallel.length).toBe(6);

            expect(facesParallel[0].position).toEqual(facesBasic[0].position);
            expect(facesParallel[0].normal).toEqual(facesBasic[0].normal);
            expect(facesParallel[0].index).toEqual(facesBasic[0].index);
        })
    })

    describe('caching', () => {
        let calculateGrid: jest.SpyInstance;

        beforeEach(() => {
            calculateGrid = jest.spyOn(c3d.TriFace, 'CalculateGrid_async');
        })

        beforeEach(() => {
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);
        })

        test('sanity check', async () => {
            const item = await makeBox.calculate() as c3d.Solid;

            await parallel.caching(async () => {
                const { edges, faces } = await parallel.create(item, stepData, formNote, true);
                expect(edges.length).toBe(12);
                expect(faces.length).toBe(6);
            });
        });

        describe('object cache', () => {
            let item: c3d.Solid;
            beforeEach(async () => {
                item = await makeBox.calculate() as c3d.Solid;
            })

            test('with cache, object hit', async () => {
                await parallel.caching(async () => {
                    const { edges: edges1, faces: faces1 } = await parallel.create(item, stepData, formNote, true);
                    expect(calculateGrid).toBeCalledTimes(6);
                    calculateGrid.mockClear();

                    const { edges: edges2, faces: faces2 } = await parallel.create(item, stepData, formNote, true);
                    expect(calculateGrid).toBeCalledTimes(0);

                    expect(faces1).toBe(faces2);
                    expect(edges1).toBe(edges2);
                });
            });

            test('with cache, object hit but different precisions', async () => {
                await parallel.caching(async () => {
                    const { edges: edges1, faces: faces1 } = await parallel.create(item, stepData, formNote, true);
                    expect(calculateGrid).toBeCalledTimes(6);
                    calculateGrid.mockClear();

                    const stepData2 = new c3d.StepData(c3d.StepType.SpaceStep, 0.5);
                    const { edges: edges2, faces: faces2 } = await parallel.create(item, stepData2, formNote, true);
                    expect(calculateGrid).toBeCalledTimes(6);

                    expect(faces1).not.toBe(faces2);
                    expect(edges1).not.toBe(edges2);
                });
            });

            test('without cache, object ~hit', async () => {
                const { edges: edges1, faces: faces1 } = await parallel.create(item, stepData, formNote, true);
                expect(calculateGrid).toBeCalledTimes(6);
                calculateGrid.mockClear();

                const { edges: edges2, faces: faces2 } = await parallel.create(item, stepData, formNote, true);
                expect(calculateGrid).toBeCalledTimes(6);

                expect(faces1).not.toBe(faces2);
                expect(edges1).not.toBe(edges2);
            });
        })

        describe.skip('face cache', () => {
            let box: visual.Solid;
            let item1: c3d.Solid, item2: c3d.Solid;

            beforeEach(async () => {
                box = await makeBox.commit() as visual.Solid;
                calculateGrid.mockClear();

                makeFillet.solid = box;
                makeFillet.edges = [box.edges.get(0)];
                makeFillet.distance = 0.1;
                item1 = await makeFillet.calculate();

                makeFillet.solid = box;
                makeFillet.edges = [box.edges.get(0)];
                makeFillet.distance = 0.15;
                item2 = await makeFillet.calculate();
            })

            test('with cache, same ancestral name, face hit', async () => {
                await parallel.caching(async () => {
                    await parallel.create(item1, stepData, formNote, true, db.lookup(box));
                    expect(calculateGrid).toBeCalledTimes(7);
                    calculateGrid.mockClear();

                    await parallel.create(item2, stepData, formNote, true, db.lookup(box));
                    expect(calculateGrid).toBeCalledTimes(5);
                });
            });

            test('with cache, diff ancestral name, face hit', async () => {
                await parallel.caching(async () => {
                    await parallel.create(item1, stepData, formNote, true, db.lookup(box));
                    expect(calculateGrid).toBeCalledTimes(7);
                    calculateGrid.mockClear();

                    makeSphere.center = new THREE.Vector3();
                    makeSphere.radius = 1;
                    const sphere = await makeSphere.calculate() as c3d.Solid;
        
                    await parallel.create(item2, stepData, formNote, true, sphere);
                    expect(calculateGrid).toBeCalledTimes(7);
                });
            });

            test('with different caches, same ancestral name, face hit', async () => {
                await parallel.caching(async () => {
                    await parallel.create(item1, stepData, formNote, true, db.lookup(box));
                    expect(calculateGrid).toBeCalledTimes(7);
                    calculateGrid.mockClear();
                });
                await parallel.caching(async () => {
                    await parallel.create(item2, stepData, formNote, true, db.lookup(box));
                    expect(calculateGrid).toBeCalledTimes(7);
                });
            });
        })
    })
});
