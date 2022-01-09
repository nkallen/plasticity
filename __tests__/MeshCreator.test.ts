import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../src/commands/box/BoxFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { BasicMeshCreator, ParallelMeshCreator } from "../src/editor/MeshCreator";
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeSphere: SphereFactory;
let makeBox: ThreePointBoxFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
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

    test('caching', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);

        const item = await makeBox.calculate() as c3d.Solid;

        await parallel.caching(async () => {
            const { edges, faces } = await parallel.create(item, stepData, formNote, true);
            expect(edges.length).toBe(12);
            expect(faces.length).toBe(6);
        });
    });
});
