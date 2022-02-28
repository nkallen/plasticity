/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { PlasticityDocument } from '../src/editor/PlasticityDocument';
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
        db = editor._db;
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
        makeBox2.p2 = new THREE.Vector3(10, 0, 0);
        makeBox2.p3 = new THREE.Vector3(10, 10, 0);
        makeBox2.p4 = new THREE.Vector3(10, 10, 10);
        box2 = await makeBox2.commit() as visual.Solid;
    });

    const dir = path.join(os.tmpdir(), 'plasticity');

    beforeAll(async () => {
        try {
            await fs.promises.access(dir);
        } catch (e) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
    })

    test("serialize & deserialize items", async () => {
        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test1.plasticity');
        save.save(filename);
        expect(db.visibleObjects.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.visibleObjects.length).toBe(0);
        await PlasticityDocument.load(filename, originator);
        expect(db.visibleObjects.length).toBe(2);
    });

    test("serialize & deserialize materials", async () => {
        const materialId = materials.add("test", new THREE.MeshPhysicalMaterial({ color: 0x123456 }));
        db.setMaterial(box1, materialId);

        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test2.plasticity');
        save.save(filename);
        expect(db.visibleObjects.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.visibleObjects.length).toBe(0);
        expect(db.getMaterial(box1)).toBe(undefined);
        expect(db.getMaterial(box2)).toBe(undefined);

        await PlasticityDocument.load(filename, originator);
        expect(db.visibleObjects.length).toBe(2);

        const bbox = new THREE.Box3();
        const box1_ = db.visibleObjects[0];
        bbox.setFromObject(box1_);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        
        const box2_ = db.visibleObjects[1];
        bbox.setFromObject(box2_);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(10, 10, 10));

        expect(db.getMaterial(box2_)).toBe(undefined);

        const mat1 = db.getMaterial(box1_)! as THREE.MeshPhysicalMaterial;
        expect(mat1).toBeInstanceOf(THREE.MeshPhysicalMaterial);
        expect(mat1.color.getHex()).toEqual(0x123456);
    });
})