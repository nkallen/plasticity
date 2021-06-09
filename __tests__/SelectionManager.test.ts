import * as THREE from 'three';
import BoxFactory from '../src/commands/box/BoxFactory';
import CircleFactory from '../src/commands/circle/CircleFactory';
import RegionFactory from '../src/commands/region/RegionFactory';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SelectionInteractionManager } from '../src/selection/SelectionInteraction';
import { UndoableSelectionManager } from '../src/selection/SelectionManager';
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionManager: UndoableSelectionManager;
let interactionManager: SelectionInteractionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    selectionManager = new UndoableSelectionManager(db, materials, signals, f => f());
    interactionManager = new SelectionInteractionManager(selectionManager, materials, signals);
});

describe('onClick', () => {
    let solid: visual.Solid;
    let circle: visual.SpaceInstance<visual.Curve3D>;
    let region: visual.PlaneInstance<visual.Region>;

    beforeEach(async () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        solid = await makeBox.commit() as visual.Solid;

        const makeCircle = new CircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeRegion = new RegionFactory(db, materials, signals);
        makeRegion.contour = circle;
        const regions = await makeRegion.commit();
        region = regions[0];
    });

    test('clicking on a curve selects the curve', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying.get(0)
        });

        expect(circle.material).toBe(materials.line(circle));
        expect(selectionManager.selectedCurves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);
        expect(circle.material).toBe(materials.highlight(circle));

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(circle.material).toBe(materials.line(circle));
    });


    test('clicking on a region selects the region', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(region.material).toBe(materials.region());
        expect(selectionManager.selectedRegions.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedRegions.size).toBe(1);
        expect(region.material).toBe(materials.highlight(region));

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedRegions.size).toBe(0);
        expect(region.material).toBe(materials.region());
    });

    test('saveToMemento & restoreFromMemento', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying.get(0)
        });

        expect(circle.material).toBe(materials.line(circle));
        expect(selectionManager.selectedCurves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);
        expect(circle.material).toBe(materials.highlight(circle));

        const memento = selectionManager.saveToMemento(new Map());

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(circle.material).toBe(materials.line(circle));

        selectionManager.restoreFromMemento(memento);

        expect(selectionManager.selectedCurves.size).toBe(1);
        circle = [...selectionManager.selectedCurves][0];
        expect(circle.material).toBe(materials.highlight(circle));
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
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(1);
        expect(face.material).toBe(materials.highlight(solid));

        interactionManager.onClick([]);
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

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);
        expect(edge.material).toBe(materials.highlight(edge));

        interactionManager.onClick(intersections);
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
        interactionManager.onClick(intersections);
        interactionManager.onClick(intersections);
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
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(0);

        interactionManager.onClick(intersections);
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

        interactionManager.onClick(intersections);
        expect(sel).toHaveBeenCalledWith(solid);
        expect(desel).not.toHaveBeenCalled();

        sel.mockReset();

        interactionManager.onClick([]);
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

        interactionManager.onPointerMove(intersections);
        expect(hov).toHaveBeenCalledWith(solid);
        expect(unhov).not.toHaveBeenCalled();

        hov.mockReset();
        unhov.mockReset();

        interactionManager.onPointerMove([]);
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
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        interactionManager.onPointerMove(intersections);
        selectionManager.hover.highlight();
        expect(edge.material).toBe(materials.hover(edge));
        selectionManager.hover.unhighlight();

        interactionManager.onPointerMove([]);
        selectionManager.hover?.highlight();
        expect(edge.material).toBe(materials.line(edge));
        selectionManager.hover?.unhighlight();
    });
})