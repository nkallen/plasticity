import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../../src/commands/circle/CircleFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { RegionFactory } from '../../src/commands/region/RegionFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { SelectionInteractionManager } from '../../src/selection/SelectionInteraction';
import { SelectionManager } from '../../src/selection/SelectionManager';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

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

let solid: visual.Solid;
let circle: visual.SpaceInstance<visual.Curve3D>;
let curve: visual.SpaceInstance<visual.Curve3D>;
let region: visual.PlaneInstance<visual.Region>;

beforeEach(async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;

    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeCurve = new LineFactory(db, materials, signals);
    makeCurve.p1 = new THREE.Vector3();
    makeCurve.p2 = new THREE.Vector3(1, 1, 1);
    curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeRegion = new RegionFactory(db, materials, signals);
    makeRegion.contours = [circle];
    const regions = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    region = regions[0];
});

describe('onClick', () => {
    test('clicking on a curve selects the curve', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.selected.curves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(0);
    });

    test('clicking on a curve then a control point selects the control point', () => {
        let intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);

        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.selected.controlPoints.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.selected.controlPoints.size).toBe(0);
    });

    test("delete curve removes the selection", () => {
        let intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);

        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.selected.controlPoints.size).toBe(1);

        selectionManager.selected.delete(curve);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.selected.controlPoints.size).toBe(0);
    });

    test.skip("reselecting curve removes control point selection", () => {
        const intersectCurve = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersectCurve);
        expect(selectionManager.selected.curves.size).toBe(1);

        const intersectControlPoint = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onClick(intersectControlPoint);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.selected.controlPoints.size).toBe(1);

        interactionManager.onClick(intersectCurve);
        expect(selectionManager.selected.curves.size).toBe(1);
        expect(selectionManager.selected.controlPoints.size).toBe(0);
    });

    test('clicking on a region selects the region', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionManager.selected.regions.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.regions.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.regions.size).toBe(0);
    });

    test('saveToMemento & restoreFromMemento', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.selected.curves.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);

        const memento = selectionManager.selected.saveToMemento();

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(0);

        selectionManager.selected.restoreFromMemento(memento);

        expect(selectionManager.selected.curves.size).toBe(1);
        circle = [...selectionManager.selected.curves][0];
    });

    test('clicking on a face selects the solid', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(0);
    });

    test('clicking on a solid then the face selects the face', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(0);
    });

    test("clicking on an solid's edge item selects the edge", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
    });

    test("delete solid removes the selection", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        interactionManager.onClick(intersections);
        interactionManager.onClick(intersections);
        expect(selectionManager.selected.edges.size).toBe(1);

        selectionManager.selected.delete(solid);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
    });

    test("deleting, then undoing, then deleting again", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        interactionManager.onClick(intersections);
        interactionManager.onClick(intersections);
        expect(selectionManager.selected.edges.size).toBe(1);

        const before = selectionManager.selected.saveToMemento();

        selectionManager.selected.delete(solid);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);

        selectionManager.selected.restoreFromMemento(before);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(1);

        selectionManager.selected.delete(solid);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
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

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(1);
        expect(selectionManager.selected.faces.size).toBe(0);
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

    test('hovering over a curve adds the curve to the hover selection', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.hovered.curves.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.hovered.curves.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);
        expect(selectionManager.hovered.curves.size).toBe(0);
    })

    test('clicking on a curve then hovering a control point adds the control point to the hover selection', () => {
        let intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying as THREE.Object3D
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);

        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.curves.size).toBe(1);
        expect(selectionManager.selected.controlPoints.size).toBe(0);
        expect(selectionManager.hovered.controlPoints.size).toBe(1);

        interactionManager.onHover([]);
        expect(selectionManager.selected.curves.size).toBe(1);
        expect(selectionManager.selected.controlPoints.size).toBe(0);
        expect(selectionManager.hovered.controlPoints.size).toBe(0);
    });

    test('hovering a region adds it to the hover selection', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionManager.selected.regions.size).toBe(0);
        expect(selectionManager.hovered.regions.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.regions.size).toBe(0);
        expect(selectionManager.hovered.regions.size).toBe(1);

        // and we don't unhover once it's hovered.
        interactionManager.onHover(intersections);
        expect(selectionManager.selected.regions.size).toBe(0);
        expect(selectionManager.hovered.regions.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.regions.size).toBe(1);
        expect(selectionManager.hovered.regions.size).toBe(0);
    });

    test('clicking on a solid then the hovering the face adds the face to the collection', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(0);
        expect(selectionManager.hovered.faces.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(1);
        expect(selectionManager.hovered.faces.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.faces.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.faces.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.faces.size).toBe(1);

        // hovering again should be a no-op
        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.faces.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.faces.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.faces.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.faces.size).toBe(0);
    });

    test('clicking on a solid then the hovering the edge adds the edge to the collection', () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(1);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(1);

        interactionManager.onClick([]);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);
    });

    test('hovering on a new item unhovers the old item', () => {
        let intersections = [];
        let edge = solid.edges.get(0);
        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        }];

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(1);

        edge = solid.edges.get(2);
        intersections = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        }];

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(1);
    });

    test("delete solid removes the hover selection", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(1);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.solids.size).toBe(1);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(1);

        selectionManager.hovered.delete(solid);
        selectionManager.selected.delete(solid);
        expect(selectionManager.selected.solids.size).toBe(0);
        expect(selectionManager.selected.edges.size).toBe(0);
        expect(selectionManager.hovered.solids.size).toBe(0);
        expect(selectionManager.hovered.edges.size).toBe(0);
    });
})

describe(SelectionManager, () => {
    test('hovering on a curve highlights the curve', () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionManager.hovered.curves.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.hovered.curves.size).toBe(1);

        interactionManager.onHover([]);
        expect(selectionManager.hovered.curves.size).toBe(0);
    });

    test('if no intersections match, it clears hover', () => {
        const intersectionsCircle = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: circle.underlying
        }];

        expect(selectionManager.selected.curves.size).toBe(0);
        expect(selectionManager.hovered.curves.size).toBe(0);

        interactionManager.onHover(intersectionsCircle);
        expect(selectionManager.hovered.curves.size).toBe(1);

        const intersectionsControlPoint = [{
            distance: 1,
            point: new THREE.Vector3(),
            object: curve.underlying.points.findByIndex(0)
        }];

        interactionManager.onHover(intersectionsControlPoint);
        expect(selectionManager.hovered.curves.size).toBe(0);
        expect(circle.underlying.segments.get(0).line.material).toBe(materials.line());
    });

    test("selecting and hovering an item, then highlight/unhighlight, doesn't error", () => {
        const intersections = [];
        intersections.push({
            distance: 1,
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionManager.selected.regions.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.regions.size).toBe(0);
        expect(selectionManager.hovered.regions.size).toBe(1);

        interactionManager.onClick(intersections);
        expect(selectionManager.selected.regions.size).toBe(1);
        expect(selectionManager.hovered.regions.size).toBe(0);

        interactionManager.onHover(intersections);
        expect(selectionManager.selected.regions.size).toBe(1);
        expect(selectionManager.hovered.regions.size).toBe(1);
    })
});