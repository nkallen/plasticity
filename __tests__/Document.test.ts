/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { PlasticityDocument } from '../src/editor/Document';
import { Editor } from '../src/editor/Editor';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { EditorOriginator } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/visual_model/VisualModel';
import './matchers';

describe(PlasticityDocument, () => {
    let originator: EditorOriginator;
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;

    beforeEach(() => {
        const editor = new Editor();
        db = editor.db;
        materials = editor.materials;
        signals = editor.signals;
        originator = editor.originator;
    });

    let box1: visual.Solid;
    let box2: visual.Solid;

    beforeEach(async () => {
        const makeBox1 = new ThreePointBoxFactory(db, materials, signals);
        makeBox1.p1 = new THREE.Vector3();
        makeBox1.p2 = new THREE.Vector3(1, 0, 0);
        makeBox1.p3 = new THREE.Vector3(1, 1, 0);
        makeBox1.p4 = new THREE.Vector3(1, 1, 1);
        box1 = await makeBox1.commit() as visual.Solid;

        const makeBox2 = new ThreePointBoxFactory(db, materials, signals);
        makeBox2.p1 = new THREE.Vector3();
        makeBox2.p2 = new THREE.Vector3(1, 0, 0);
        makeBox2.p3 = new THREE.Vector3(1, 1, 0);
        makeBox2.p4 = new THREE.Vector3(1, 1, 1);
        box2 = await makeBox2.commit() as visual.Solid;
    });

    test("serialize & deserialize", async () => {
        const dir = path.join(os.tmpdir(), 'plasticity');
        const filename = path.join(dir, 'filename');
        try {
            await fs.promises.access(dir);
        } catch (e) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        const save = new PlasticityDocument(originator);
        save.save(filename);
        expect(db.visibleObjects.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.visibleObjects.length).toBe(0);
        await PlasticityDocument.load(filename, originator);
        expect(db.visibleObjects.length).toBe(2);
    })
})