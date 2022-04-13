/**
 * @jest-environment jsdom
 */
import * as os from 'os';
import * as path from 'path';
import * as THREE from "three";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { Editor } from "../src/editor/Editor";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import { ImporterExporter } from "../src/editor/ImporterExporter";
import MaterialDatabase from "../src/editor/MaterialDatabase";
import * as visual from '../src/visual_model/VisualModel';
import './matchers';

let importer: ImporterExporter;
let editor: Editor;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    editor = new Editor();
    db = editor._db;
    materials = editor.materials;
    signals = editor.signals;
    importer = new ImporterExporter(editor._db, editor.contours);
});

test("export & import c3d", async () => {
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    const item = await makeSphere.commit() as visual.Solid;
    const model = db.saveToMemento().model;

    await db.removeItem(item);
    expect(db.items.length).toBe(0);

    const dir = os.tmpdir();
    const filePath = path.join(dir, 'export.c3d');
    await importer.export(model, filePath);

    await editor.contours.transaction(() => 
        importer.open([filePath])
    );
    expect(db.items.length).toBe(1);
})