import * as THREE from 'three';
import BoxFactory from '../src/commands/box/BoxFactory';
import { CircleFactory } from '../src/commands/circle/CircleFactory';
import LineFactory from '../src/commands/line/LineFactory';
import { RegionFactory } from '../src/commands/region/RegionFactory';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { HighlightManager } from '../src/selection/HighlightManager';
import { SelectionInteractionManager } from '../src/selection/SelectionInteraction';
import { SelectionManager } from '../src/selection/SelectionManager';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionManager: SelectionManager;
let interactionManager: SelectionInteractionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selectionManager = new SelectionManager(db, materials, signals);
    interactionManager = new SelectionInteractionManager(selectionManager, materials, signals);
});

describe('onClick', () => {
    let solid: visual.Solid;
    let circle: visual.SpaceInstance<visual.Curve3D>;
    let curve: visual.SpaceInstance<visual.Curve3D>;
    let region: visual.PlaneInstance<visual.Region>;

    beforeEach(async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
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

        const makeCurve = new LineFactory(db, materials, signals);
        makeCurve.p1 = new THREE.Vector3();
        makeCurve.p2 = new THREE.Vector3(1, 1, 1);
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeRegion = new RegionFactory(db, materials, signals);
        makeRegion.contours = [circle];
        const regions = await makeRegion.commit();
        region = regions[0];
    });

    test('clicking on a curve selects the curve', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.selectedCurves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
    });

    test('clicking on a curve then a control point selects the control point', () => {
        let intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);

        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(selectionManager.selectedControlPoints.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(selectionManager.selectedControlPoints.size).toBe(0);
    });

    test("delete curve removes the selection", () => {
        let intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);

        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(selectionManager.selectedControlPoints.size).toBe(1);

        selectionManager.delete(curve);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(selectionManager.selectedControlPoints.size).toBe(0);
    });

    test("reselecting curve removes control point selection", () => {
        const intersectCurve = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersectCurve);
        expect(selectionManager.selectedCurves.size).toBe(1);

        const intersectControlPoint = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersectControlPoint);
        expect(selectionManager.selectedCurves.size).toBe(0);
        expect(selectionManager.selectedControlPoints.size).toBe(1);

        interactionManager.onClick(intersectCurve);
        expect(selectionManager.selectedCurves.size).toBe(1);
        expect(selectionManager.selectedControlPoints.size).toBe(0);
    });

    test('clicking on a region selects the region', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionManager.selectedRegions.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedRegions.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedRegions.size).toBe(0);
    });

    test('saveToMemento & restoreFromMemento', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.selectedCurves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(1);

        const memento = selectionManager.saveToMemento(new Map());

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedCurves.size).toBe(0);

        selectionManager.restoreFromMemento(memento);

        expect(selectionManager.selectedCurves.size).toBe(1);
        circle = [...selectionManager.selectedCurves][0];
    });

    test('clicking on a face selects the solid', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(0);
    });

    test('clicking on a solid then the face selects the face', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionManager.selectedSolids.size).toBe(0);
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedFaces.size).toBe(0);
    });


    test("clicking on an solid's edge item selects the edge", () => {
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
        expect(selectionManager.selectedSolids.size).toBe(1);
        expect(selectionManager.selectedEdges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
    });

    test("delete solid removes the selection", () => {
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
    });

    test("deleting, then undoing, then deleting again", () => {
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

        const before = selectionManager.saveToMemento(new Map());

        selectionManager.delete(solid);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);

        selectionManager.restoreFromMemento(before);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(1);

        selectionManager.delete(solid);
        expect(selectionManager.selectedSolids.size).toBe(0);
        expect(selectionManager.selectedEdges.size).toBe(0);
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
        expect(db.temporaryObjects.children.length).toBe(0);
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

        interactionManager.onHover(intersections);
        expect(hov).toHaveBeenCalledWith(solid);
        expect(unhov).not.toHaveBeenCalled();

        hov.mockReset();
        unhov.mockReset();

        interactionManager.onHover([]);
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
        const highlighter = new HighlightManager(db);

        expect(edge.child.material).toBe(materials.line(edge));
        interactionManager.onClick(intersections);
        expect(selectionManager.selectedSolids.size).toBe(1);

        interactionManager.onHover(intersections);
        selectionManager.hover.highlight(highlighter);
        expect(edge.child.material).toBe(materials.hover(edge));
        selectionManager.hover.unhighlight(highlighter);

        interactionManager.onHover([]);
        selectionManager.hover?.highlight(highlighter);
        expect(edge.child.material).toBe(materials.line(edge));
        selectionManager.hover?.unhighlight(highlighter);
    });
})