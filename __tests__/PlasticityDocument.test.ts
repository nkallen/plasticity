/**
 * @jest-environment jsdom
 */
import * as os from 'os';
import * as path from 'path';
import * as THREE from 'three';
import * as fs from 'fs';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { Editor } from '../src/editor/Editor';
import { EditorSignals } from '../src/editor/EditorSignals';
import { Empties } from '../src/editor/Empties';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { Group } from '../src/editor/Groups';
import { EditorOriginator } from '../src/editor/History';
import { Images } from '../src/editor/Images';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlasticityDocument } from '../src/editor/PlasticityDocument';
import { Scene } from '../src/editor/Scene';
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
        const { json, c3d } = await save.serialize(filename);
        expect(db.items.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.items.length).toBe(0);
        await PlasticityDocument.load(json, c3d, originator);
        expect(db.items.length).toBe(2);
    });

    test("serialize & deserialize names", async () => {
        scene.setName(box1, "my first box");
        scene.setName(box2, "my other box");

        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test3.plasticity');
        const { json, c3d } = await save.serialize(filename);
        expect(db.items.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.items.length).toBe(0);
        expect(() => scene.getName(box1)).toThrow();
        expect(() => scene.getName(box2)).toThrow();

        await PlasticityDocument.load(json, c3d, originator);
        expect(db.items.length).toBe(2);

        const box1_ = db.items[0].view;
        const box2_ = db.items[1].view;
        expect(scene.getName(box1_)).toBe("my first box");
        expect(scene.getName(box2_)).toBe("my other box");
    });

    test("serialize & deserialize materials", async () => {
        const materialId = materials.add("test", new THREE.MeshPhysicalMaterial({ color: 0x123456 }));
        scene.setMaterial(box1, materialId);

        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test2.plasticity');
        const { json, c3d } = await save.serialize(filename);
        expect(db.items.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        expect(db.items.length).toBe(0);
        expect(() => scene.getMaterial(box1)).toThrow();
        expect(() => scene.getMaterial(box2)).toThrow();

        await PlasticityDocument.load(json, c3d, originator);
        expect(db.items.length).toBe(2);

        const bbox = new THREE.Box3();
        const box1_ = db.items[0].view;
        bbox.setFromObject(box1_);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        const box2_ = db.items[1].view;
        bbox.setFromObject(box2_);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(10, 10, 10));

        expect(scene.getMaterial(box2_)).toBe(undefined);

        const mat1 = scene.getMaterial(box1_)! as THREE.MeshPhysicalMaterial;
        expect(mat1).toBeInstanceOf(THREE.MeshPhysicalMaterial);
        expect(mat1.color.getHex()).toEqual(0x123456);
    });

    test("serialize & deserialize groups", async () => {
        const group = scene.createGroup();
        scene.setName(group, "My group");
        scene.moveToGroup(box1, group);

        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test4.plasticity');
        const { json, c3d } = await save.serialize(filename);
        expect(db.items.length).toBe(2);
        await db.removeItem(box1);
        await db.removeItem(box2);
        scene.deleteGroup(group);
        expect(db.items.length).toBe(0);
        expect(() => scene.getName(box1)).toThrow();
        expect(() => scene.getName(box2)).toThrow();
        expect(() => scene.list(group)).toThrow();

        await PlasticityDocument.load(json, c3d, originator);
        expect(db.items.length).toBe(2);

        const root = scene.root;
        const g1 = new Group(1);
        const rootChildren = scene.list(root);
        expect(rootChildren.length).toBe(2);
        expect(rootChildren[0]).toEqual({ item: db.items[1].view, tag: "Item" });
        expect(rootChildren[1]).toEqual({ group: g1, tag: "Group" });

        const groupChildren = scene.list(g1);
        expect(groupChildren.length).toBe(1);
        expect(groupChildren[0]).toEqual({ item: db.items[0].view, tag: "Item" });
    });

    test.only("serialize & deserialize empties", async () => {
        const img = document.createElement("img");
        URL.createObjectURL = jest.fn().mockImplementation(() => 'data:1234');
        URL.revokeObjectURL = jest.fn();
        const buf = Buffer.from('');
        jest.spyOn(fs.promises, 'readFile').mockImplementation(() => Promise.resolve(buf));
        THREE.Cache.get = () => img;

        await images.add('/test/foo', buf);
        const empty = empties.addImage('/test/foo');
        const save = new PlasticityDocument(originator);
        const filename = path.join(dir, 'test5.plasticity');
        const { json, c3d } = await save.serialize(filename);
        expect(empties.items.length).toBe(1);
        
        empties.removeItem(empty);
        images.clear();
        expect(empties.items.length).toBe(0);
        await PlasticityDocument.load(json, c3d, originator);
        expect(empties.items.length).toBe(1);
    });
})