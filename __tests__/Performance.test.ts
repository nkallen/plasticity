import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

jest.setTimeout(20_000);

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
});


// NAIVE: 10980 10962 10931 11096
// FIRST OPTIMIZATION: 3285 3251 3264 3316 3318
test('deserialize', async () => {
    const filePath = '/Users/nickkallen/Downloads/tactical.c3d';
    const data = await fs.promises.readFile(filePath);
    const start = performance.now();
    await db.deserialize(data);
    const end = performance.now();
    console.log(end - start);
})