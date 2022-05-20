/**
 * @jest-environment jsdom
 */
import * as os from 'os';
import * as path from 'path';
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { Editor } from '../src/editor/Editor';
import { EditorSignals } from '../src/editor/EditorSignals';
import { Empties } from '../src/editor/Empties';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { EditorOriginator } from '../src/editor/History';
import { Images } from '../src/editor/Images';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { Scene } from '../src/editor/Scene';
import { PlasticityDocument } from '../src/editor/serialization/PlasticityDocument';
import { Chunkifier } from '../src/editor/serialization/Chunkifier';
import * as visual from '../src/visual_model/VisualModel';
import './matchers';

describe(PlasticityDocument, () => {
    let originator: EditorOriginator;
    let db: GeometryDatabase;
    let empties: Empties;
    let materials: MaterialDatabase;
    let signals: EditorSignals;
    let scene: Scene;
    let images: Images;

    beforeEach(() => {
        const editor = new Editor();
        db = editor._db;
        empties = editor.empties;
        images = editor.images;
        scene = editor.scene;
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

    test("serialize & deserialize items", async () => {
        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test1.plasticity');
        const before = await save.serialize(filename);
        const chunkifier = new Chunkifier('plasticity', 1, before.json, before.c3d);
        const data = chunkifier.serialize();
        const after = Chunkifier.load(data);
    });
})