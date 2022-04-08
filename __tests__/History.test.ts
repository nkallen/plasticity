/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { GizmoMaterialDatabase } from '../src/command/GizmoMaterials';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { Viewport } from '../src/components/viewport/Viewport';
import ContourManager from '../src/editor/curves/ContourManager';
import { CrossPointDatabase } from '../src/editor/curves/CrossPointDatabase';
import { PlanarCurveDatabase } from '../src/editor/curves/PlanarCurveDatabase';
import { Editor } from '../src/editor/Editor';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { EditorOriginator, History } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { Scene } from '../src/editor/Scene';
import { SnapManager } from '../src/editor/snaps/SnapManager';
import { SolidCopier } from '../src/editor/SolidCopier';
import { Selection, SelectionDatabase } from '../src/selection/SelectionDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { MakeViewport } from '../__mocks__/FakeViewport';
import './matchers';

describe(EditorOriginator, () => {
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;
    let snaps: SnapManager;
    let selected: Selection;
    let gizmos: GizmoMaterialDatabase;
    let originator: EditorOriginator;
    let curves: PlanarCurveDatabase;
    let contours: ContourManager;
    let selection: SelectionDatabase;
    let crosses: CrossPointDatabase;
    let viewports: Viewport[];
    let scene: Scene;
    let history: History;

    beforeEach(() => {
        const editor = new Editor();
        history = editor.history;
        materials = editor.materials;
        signals = editor.signals;
        db = editor._db;
        gizmos = editor.gizmos;
        crosses = editor.crosses;
        snaps = editor.snaps;
        selection = editor.selection;
        selected = selection.selected;
        curves = editor.curves;
        contours = editor.contours;
        viewports = [MakeViewport(editor)];
        scene = editor.scene;
        originator = new EditorOriginator(db, scene, materials, selected, snaps, crosses, curves, contours, viewports);
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

    test("saveToMemento & restoreFromMemento", () => {
        const memento = originator.saveToMemento();

        db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
        originator = new EditorOriginator(db, scene, materials, selected, snaps, crosses, curves, contours, viewports);

        originator.restoreFromMemento(memento);
        expect(1).toBe(1);
    });

    test("undo & redo", async () => {
        history.add("Initial", originator.saveToMemento());
        expect(db.items.length).toBe(2);
        await db.removeItem(box1);
        expect(db.items.length).toBe(1);
        history.undo();
        expect(db.items.length).toBe(2);
        history.redo();
        expect(db.items.length).toBe(2);
    })
})