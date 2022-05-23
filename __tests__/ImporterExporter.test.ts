/**
 * @jest-environment jsdom
 */
import * as os from 'os';
import * as path from 'path';
import * as THREE from "three";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { Editor } from "../src/editor/Editor";
import { EditorSignals } from "../src/editor/EditorSignals";
import { Empties } from '../src/editor/Empties';
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import { EditorOriginator } from '../src/editor/History';
import { Images } from '../src/editor/Images';
import { ImporterExporter } from "../src/editor/ImporterExporter";
import MaterialDatabase from "../src/editor/MaterialDatabase";
import { Scene } from '../src/editor/Scene';
import * as visual from '../src/visual_model/VisualModel';
import './matchers';

let importer: ImporterExporter;
let editor: Editor;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let empties: Empties;
let images: Images;
let scene: Scene;

beforeEach(() => {
    editor = new Editor();
    db = editor._db;
    materials = editor.materials;
    signals = editor.signals;
    images = editor.images;
    empties = new Empties(images, signals);
    scene = new Scene(db, empties, materials, signals);
    importer = new ImporterExporter(editor.originator, editor._db, empties, scene, images, editor.contours, signals);
});

test("export & import c3d", async () => {
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    const item = await makeSphere.commit() as visual.Solid;

    const dir = os.tmpdir();
    const filePath = path.join(dir, 'export.c3d');
    await importer.export(filePath);

    await db.removeItem(item);
    expect(db.items.length).toBe(0);

    await editor.contours.transaction(() =>
        importer.import([filePath])
    );
    expect(db.items.length).toBe(1);
})