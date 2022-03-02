import * as fs from 'fs';
import { performance } from 'perf_hooks';
import c3d from '../build/Release/c3d.node';
import { CrossPointDatabase } from '../src/editor/curves/CrossPointDatabase';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { DoCacheMeshCreator, ParallelMeshCreator } from '../src/editor/MeshCreator';
import { SnapManager } from '../src/editor/snaps/SnapManager';
import { SolidCopier } from '../src/editor/SolidCopier';
import { unit } from '../src/util/Conversion';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

jest.setTimeout(20_000);

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

// NOTE: run `ndb .` and run the "benchmark" script.

describe.skip("A model with many items", () => {
    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    });

    let data: Buffer;
    beforeEach(async () => {
        const filePath = '/Users/nickkallen/Downloads/tactical.c3d';
        data = await fs.promises.readFile(filePath);
    })

    // NAIVE: 10980 10962 10931 11096
    // FIRST OPTIMIZATION: 3285 3251 3264 3316 3318
    // SECOND OPTIMIZATION: (Edge and Face are no longer subclasses of THREE.Object3D) 2834 2896 2998 2857 2823
    // THIRD OPTIMIZATION: merge buffer geometry 2565 2493 2495 2474 2521.
    // FOURTH: mesh generation optimization:s 2120 2065 2097 2068 2074
    // IF we can cache edges during triangulation: 1500
    test.skip('deserialize', async () => {
        const start = performance.now();
        await db.deserialize(data);
        const end = performance.now();
        console.log(end - start);
    })

    // NAIVE: 9981 9091 9917 8902 9868
    // IF PointSnap doesn't instantiate a snapper & nearby: closer to 6963 6759 6714
    // If CurveEdgeSnap snapper can be avoided: 6138 6125 6120
    // Generate helper lazily: 5538 5544 5541
    test.skip('snaps', async () => {
        const snaps = new SnapManager(db, new CrossPointDatabase(), signals);
        const start = performance.now();
        await db.deserialize(data);
        const end = performance.now();
        console.log(end - start);
    })
})

describe.skip("One item with many faces", () => {
    let meshCreator: DoCacheMeshCreator;
    let copier: SolidCopier;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        copier = new SolidCopier();
        meshCreator = new DoCacheMeshCreator(new ParallelMeshCreator(), copier);
        db = new GeometryDatabase(meshCreator, copier, materials, signals);
    });

    let wheel: c3d.Solid;
    beforeEach(async () => {
        const filePath = '/Users/nickkallen/Downloads/wheel-copy-slow.c3d';
        const data = await fs.promises.readFile(filePath);
        await db.deserialize(data);
        wheel = db.findAll()[0].model;
    })

    // 140 140 141 142 142
    test('create mesh no cache', async () => {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, unit(0.0005));
        const formNote = new c3d.FormNote(true, true, false, false, false);
        const start = performance.now();
        await meshCreator.create(wheel, stepData, formNote, true, true);
        const end = performance.now();
        console.log(end - start);
    })

    // 1: 212 208 209 210 208
    // 2: 171 161 163 163 164
    test.only('create mesh empty cache', async () => {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, unit(0.0005));
        const formNote = new c3d.FormNote(true, true, false, false, false);
        const start = performance.now();
        await meshCreator.caching(async () => {
            await meshCreator.create(wheel, stepData, formNote, true, false);
        });
        const end = performance.now();
        console.log(end - start);
    })

    // 5 6 5 5 6
    test('create mesh when cache hit', async () => {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, unit(0.0005));
        const formNote = new c3d.FormNote(true, true, false, false, false);
        await copier.caching(async () => {
            await meshCreator.caching(async () => {
                const pool = copier.pool(wheel, 2);
                const copy1 = await pool.Pop();
                await meshCreator.create(copy1, stepData, formNote, true, false);
                const copy2 = await pool.Pop();
                const start = performance.now();
                await meshCreator.create(copy2, stepData, formNote, true, false);
                const end = performance.now();
                console.log(end - start);
            });
        })
    })
})
