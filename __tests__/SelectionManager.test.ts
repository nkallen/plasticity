import * as THREE from 'three';
import BoxFactory from '../src/commands/box/BoxFactory';
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

    beforeEach(async () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        solid = await makeBox.commit() as visual.Solid;
    });

    test('clicking on a face selects the solid', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
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
            object: solid.edges.get(0)
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

    test("clicking on both a line and a face selects the line", () => {
        const intersections = [
            {
                distance: 1,
                point: new THREE.Vector3(),
                object: solid.faces.get(0)
            },
            {
                distance: 1,
                point: new THREE.Vector3(),
                object: solid.edges.get(0)
            }
        ];

        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(0);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);
        expect(selectionManager.selectedFaces.size).toBe(0);
    });

    test("signals", () => {
        const sel = jest.fn();
        signals.objectSelected.add(sel);
        const desel = jest.fn();
        signals.objectDeselected.add(desel);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
        });

        selectionManager.onClick(intersections);
        expect(sel).toHaveBeenCalledWith(solid);
        expect(desel).not.toHaveBeenCalled();

        sel.mockReset();

        selectionManager.onClick([]);
        expect(sel).not.toHaveBeenCalled();
        expect(desel).toHaveBeenCalledWith(solid);
    })
})

describe('onPointerMove', () => {
    let solid: visual.Solid;

    beforeEach(async () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        solid = await makeBox.commit() as visual.Solid;
    });
    
    test("hovering in and out sends signals", () => { 
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
        });

        const hov = jest.fn();
        signals.objectHovered.add(hov);
        const unhov = jest.fn();
        signals.objectUnhovered.add(unhov);

        selectionManager.onPointerMove(intersections);
        expect(hov).toHaveBeenCalledWith(solid);
        expect(unhov).not.toHaveBeenCalled();

        hov.mockReset();
        unhov.mockReset();

        selectionManager.onPointerMove([]);
        expect(hov).not.toHaveBeenCalled();
        expect(unhov).toHaveBeenCalledWith(solid);
    })
})