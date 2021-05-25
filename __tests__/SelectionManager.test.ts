import * as THREE from 'three';
import BoxFactory from '../src/commands/box/BoxFactory';
import LineFactory from '../src/commands/line/LineFactory';
import { Editor, EditorSignals } from '../src/Editor';
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
let editor: Editor;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    selectionManager = new SelectionManager(db, materials, signals, f => f());
});

describe('onClick', () => {
    let solid: visual.Solid;
    let line: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        solid = await makeBox.commit() as visual.Solid;

        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
    });

    test('clicking on a curve selects the curve', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: line.underlying.get(0)
        });

        expect(line.material).toBe(materials.line(line));
        expect(selectionManager.selectedCurves.size).toBe(0);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);
        expect(line.material).toBe(materials.highlight(line));

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(line.material).toBe(materials.line(line));
    });

    test('saveToMemento & restoreFromMemento', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: line.underlying.get(0)
        });

        expect(line.material).toBe(materials.line(line));
        expect(selectionManager.selectedCurves.size).toBe(0);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);
        expect(line.material).toBe(materials.highlight(line));

        const memento = selectionManager.saveToMemento(new Map());

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(line.material).toBe(materials.line(line));

        selectionManager.restoreFromMemento(memento);

        expect(selectionManager.selectedCurves.size).toBe(1);
        line = [...selectionManager.selectedCurves][0];
        expect(line.material).toBe(materials.highlight(line));
    });

    test('clicking on a face selects the solid', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(face.material).toBe(materials.mesh(solid));
        expect(selectionManager.selectedSolids.size).toBe(0);
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(1);
        expect(face.material).toBe(materials.highlight(solid));

        selectionManager.onClick([]);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(0);
        expect(face.material).toBe(materials.mesh(solid));
    });

    test("clicking on an solid's topo item selects the topo item", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        expect(edge.material).toBe(materials.line(edge));

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);
        expect(edge.material).toBe(materials.highlight(edge));

        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        expect(edge.material).toBe(materials.line(edge));
    });

    test("delete removes the selection", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        selectionManager.onClick(intersections);
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedEdges.size).toBe(1);

        selectionManager.delete(solid);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
        // expect(edge.material).toBe(materials.line(edge));
    });

    test("clicking on both a edge and a face selects the edge", () => {
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
    });

    test("hovering over a edge of a selected solid changes material", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(edge.material).toBe(materials.line(edge));
        selectionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        selectionManager.onPointerMove(intersections);
        expect(edge.material).toBe(materials.hover(edge));

        selectionManager.onPointerMove([]);
        expect(edge.material).toBe(materials.line(edge));
    });
})