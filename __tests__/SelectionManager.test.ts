import * as THREE from 'three';
import BoxFactory from '../src/commands/Box';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SelectionManager } from '../src/selection/SelectionManager';
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let selectionManager: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    selectionManager = new SelectionManager(db, materials, signals);
});

describe('onClick', () => {
    let solid: visual.Solid;

    beforeEach(() => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        makeBox.commit();
        expect(db.scene.children.length).toBe(1);
        solid = db.scene.children[0] as visual.Solid;
        expect(solid).toBeInstanceOf(visual.Solid);
    });

    test('clicking on a face selects the solid', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: solid.faces.children[0]
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        selectionManager.delete(solid);
        expect(selectionManager.selectedSolids.size).toBe(0);
    });

    test("clicking on an object's topo item selects the topo item", () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: solid.edges.children[0]
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);

        selectionManager.delete(solid);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
    });
})