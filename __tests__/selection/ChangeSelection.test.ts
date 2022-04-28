import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../../src/commands/circle/CircleFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { RegionFactory } from '../../src/commands/region/RegionFactory';
import ContourManager from '../../src/editor/curves/ContourManager';
import { CrossPointDatabase } from '../../src/editor/curves/CrossPointDatabase';
import { PlanarCurveDatabase } from '../../src/editor/curves/PlanarCurveDatabase';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { Empties } from '../../src/editor/Empties';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Group } from '../../src/editor/Groups';
import { EditorOriginator } from '../../src/editor/History';
import { Images } from '../../src/editor/Images';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Scene } from '../../src/editor/Scene';
import { SnapManager } from '../../src/editor/snaps/SnapManager';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { ChangeSelectionExecutor, ChangeSelectionModifier, ChangeSelectionOption } from '../../src/selection/ChangeSelectionExecutor';
import { SelectionDatabase } from '../../src/selection/SelectionDatabase';
import { SelectionMode } from '../../src/selection/SelectionModeSet';
import { Intersection } from '../../src/visual_model/Intersectable';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let changeSelection: ChangeSelectionExecutor;
let originator: EditorOriginator;
let scene: Scene;
let snaps: SnapManager;
let crosses: CrossPointDatabase;
let curves: PlanarCurveDatabase;
let contours: ContourManager;
let empties: Empties;
let images: Images;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    scene = new Scene(db, empties, materials, signals);
    selectionDb = new SelectionDatabase(db, scene, materials, signals);
    images = new Images();
    empties = new Empties(images, signals);
    changeSelection = new ChangeSelectionExecutor(selectionDb, db, scene, signals);
    crosses = new CrossPointDatabase();
    snaps = new SnapManager(db, scene, crosses, signals);
    curves = new PlanarCurveDatabase(db);
    originator = new EditorOriginator(db, empties, scene, materials, selectionDb.selected, snaps, crosses, curves, contours, [], images);
});

let solid: visual.Solid;
let circle: visual.SpaceInstance<visual.Curve3D>;
let curve: visual.SpaceInstance<visual.Curve3D>;
let region: visual.PlaneInstance<visual.Region>;
let group: Group;

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

    group = scene.createGroup();
});

describe('onClick', () => {
    test('clicking on a curve selects the curve', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionDb.selected.curves.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
    });

    test('clicking on a curve then a control point selects the control point', () => {
        let intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying
        }] as Intersection[];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);

        intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying.points.get(0)
        }];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    });

    test('clicking on a curve then box selecting a control point selects the control point', () => {
        let intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying
        }] as Intersection[];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);

        const boxed = new Set([curve.underlying.points.get(0)]);

        changeSelection.onBoxSelect(boxed, ChangeSelectionModifier.Add);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    });

    test("delete curve removes the selection", async () => {
        let intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying
        }] as Intersection[];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);

        intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying.points.get(0)
        }];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(1);

        await db.removeItem(curve);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    });

    test('clicking on a region selects the region', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionDb.selected.regions.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(1);
    });

    test('saveToMemento & restoreFromMemento', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionDb.selected.curves.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);

        const memento = selectionDb.selected.saveToMemento();

        changeSelection.onClick(intersections, ChangeSelectionModifier.Remove, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);

        selectionDb.selected.restoreFromMemento(memento);

        expect(selectionDb.selected.curves.size).toBe(1);
        circle = [...selectionDb.selected.curves][0];
    });

    test('clicking on a face selects the solid', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(0);
    });

    test('clicking on a solid then the face selects the face', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(0);
    });

    test("clicking on an solid's edge item selects the edge", () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.edges.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(1);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(1);
    });

    test("delete solid removes the selection", async () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(1);

        await db.removeItem(solid);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
    });

    test("deleting, then undoing, then deleting again", async () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.edges.size).toBe(1);

        const before = originator.saveToMemento();

        await db.removeItem(solid);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);

        originator.restoreFromMemento(before);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(1);

        await db.removeItem(solid);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
    });

    test("basic signals", () => {
        const sel = jest.fn(), desel = jest.fn(), delta = jest.fn();
        signals.objectSelected.add(sel);
        signals.objectDeselected.add(desel);
        signals.selectionDelta.add(delta);

        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
        });

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(sel).toHaveBeenCalledWith(solid);
        expect(desel).not.toHaveBeenCalled();
        expect(delta).toHaveBeenCalled();

        sel.mockReset();
        desel.mockRestore();
        delta.mockReset();

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(sel).not.toHaveBeenCalled();
        expect(desel).toHaveBeenCalledWith(solid);
        expect(delta).toHaveBeenCalled();
    })

    test("signal aggregation", () => {
        const sel = jest.fn(), desel = jest.fn(), delta = jest.fn();
        signals.objectSelected.add(sel);
        signals.objectDeselected.add(desel);
        signals.selectionDelta.add(delta);

        let intersections = [];
        intersections = [{
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
        }];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(sel).toHaveBeenCalledTimes(1);
        expect(desel).toHaveBeenCalledTimes(0);
        expect(delta).toHaveBeenCalledTimes(1);

        sel.mockReset();
        desel.mockRestore();
        delta.mockReset();

        intersections = [{
            point: new THREE.Vector3(),
            object: circle.underlying
        }];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(sel).toHaveBeenCalledTimes(1);
        expect(desel).toHaveBeenCalledTimes(1);
        expect(delta).toHaveBeenCalledTimes(1);
    })
})

describe('onPointerMove', () => {
    test("hovering in and out sends signals", () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: solid.faces.get(0)
        });

        const hov = jest.fn();
        signals.objectHovered.add(hov);
        const unhov = jest.fn();
        signals.objectUnhovered.add(unhov);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(hov).toHaveBeenCalledWith(solid);
        expect(unhov).not.toHaveBeenCalled();

        hov.mockReset();
        unhov.mockReset();

        changeSelection.onHover([], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(hov).not.toHaveBeenCalled();
        expect(unhov).toHaveBeenCalledWith(solid);
    });

    test('hovering over a curve adds the curve to the hover selection', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.hovered.curves.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.hovered.curves.size).toBe(1);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.hovered.curves.size).toBe(0);
    })

    test('clicking on a curve then hovering a control point adds the control point to the hover selection', () => {
        let intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying
        }] as Intersection[];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);

        intersections = [{
            point: new THREE.Vector3(),
            object: curve.underlying.points.get(0)
        }];

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
        expect(selectionDb.hovered.controlPoints.size).toBe(1);

        changeSelection.onHover([], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.curves.size).toBe(1);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
        expect(selectionDb.hovered.controlPoints.size).toBe(0);
    });

    test('hovering a region adds it to the hover selection', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionDb.selected.regions.size).toBe(0);
        expect(selectionDb.hovered.regions.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(0);
        expect(selectionDb.hovered.regions.size).toBe(1);

        // and we don't unhover once it's hovered.
        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(0);
        expect(selectionDb.hovered.regions.size).toBe(1);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(1);
        expect(selectionDb.hovered.regions.size).toBe(0);
    });

    test('clicking on a solid then the hovering the face adds the face to the collection', () => {
        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.hovered.faces.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(1);
        expect(selectionDb.hovered.faces.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.faces.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.faces.size).toBe(1);

        // hovering again should be a no-op
        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.faces.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.faces.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.faces.size).toBe(0);
    });

    test('clicking on a solid then the hovering the edge adds the edge to the collection', () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(1);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(1);

        changeSelection.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);
    });

    test('hovering on a new item unhovers the old item', () => {
        let intersections = [];
        let edge = solid.edges.get(0);
        intersections = [{
            point: new THREE.Vector3(),
            object: edge
        }];

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(1);

        edge = solid.edges.get(2);
        intersections = [{
            point: new THREE.Vector3(),
            object: edge
        }];

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(1);
    });

    test("delete solid removes the hover selection", async () => {
        const intersections = [];
        const edge = solid.edges.get(0);
        intersections.push({
            point: new THREE.Vector3(),
            object: edge
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(1);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(1);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(1);

        await db.removeItem(solid);
        expect(selectionDb.selected.solids.size).toBe(0);
        expect(selectionDb.selected.edges.size).toBe(0);
        expect(selectionDb.hovered.solids.size).toBe(0);
        expect(selectionDb.hovered.edges.size).toBe(0);
    });
})

describe('Outliner', () => {
    test('onOutlinerSelect', () => {
        const selected = jest.fn(), deselected = jest.fn(), delta = jest.fn();
        signals.objectSelected.add(selected);
        signals.objectDeselected.add(deselected);
        signals.selectionDelta.add(delta);

        expect(selectionDb.selected.groups.size).toBe(0);
        expect(selected).toBeCalledTimes(0);
        expect(deselected).toBeCalledTimes(0);
        expect(delta).toBeCalledTimes(0);

        changeSelection.onOutlinerSelect([group], ChangeSelectionModifier.Add, ChangeSelectionOption.None);

        expect(selectionDb.selected.groups.size).toBe(1);
        expect(selected).toBeCalledTimes(1);
        expect(deselected).toBeCalledTimes(0);
        expect(delta).toBeCalledTimes(1);
    })

    test('onOutlinerHover', () => {
        const selected = jest.fn(), deselected = jest.fn(), delta = jest.fn();
        signals.hoverDelta.add(delta);

        expect(selectionDb.hovered.groups.size).toBe(0);
        expect(selected).toBeCalledTimes(0);
        expect(deselected).toBeCalledTimes(0);
        expect(delta).toBeCalledTimes(0);

        changeSelection.onOutlinerHover([group], ChangeSelectionModifier.Add, ChangeSelectionOption.None);

        expect(selectionDb.hovered.groups.size).toBe(1);
        expect(delta).toBeCalledTimes(1);
    })
});

describe(SelectionDatabase, () => {
    test('hovering on a curve highlights the curve', () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: circle.underlying
        });

        expect(selectionDb.hovered.curves.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.hovered.curves.size).toBe(1);

        changeSelection.onHover([], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.hovered.curves.size).toBe(0);
    });

    test('if no intersections match, it clears hover', () => {
        const intersectionsCircle = [{
            point: new THREE.Vector3(),
            object: circle.underlying
        }];

        expect(selectionDb.selected.curves.size).toBe(0);
        expect(selectionDb.hovered.curves.size).toBe(0);

        changeSelection.onHover(intersectionsCircle, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.hovered.curves.size).toBe(1);

        const intersectionsControlPoint = [{
            point: new THREE.Vector3(),
            object: curve.underlying.points.get(0)
        }];

        changeSelection.onHover(intersectionsControlPoint, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.hovered.curves.size).toBe(0);
    });

    test("selecting and hovering an item, then highlight/unhighlight, doesn't error", () => {
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: region.underlying
        });

        expect(selectionDb.selected.regions.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(0);
        expect(selectionDb.hovered.regions.size).toBe(1);

        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(1);
        expect(selectionDb.hovered.regions.size).toBe(0);

        changeSelection.onHover(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.regions.size).toBe(1);
        expect(selectionDb.hovered.regions.size).toBe(1);
    })
});

describe('prohibit', () => {
    test('selectionmode=object, clicking on a face of a prohibited solid will not select the object', () => {
        changeSelection = new ChangeSelectionExecutor(selectionDb, db, scene, signals, new Set([solid]));

        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionDb.selected.solids.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.solids.size).toBe(0);
    });

    test('selectionmode=face, clicking on a face of a prohibited solid will not select the face', () => {
        changeSelection = new ChangeSelectionExecutor(selectionDb, db, scene, signals, new Set([solid]));
        selectionDb.mode.set(SelectionMode.Face);

        const face = solid.faces.get(0);
        const intersections = [];
        intersections.push({
            point: new THREE.Vector3(),
            object: face
        });

        expect(selectionDb.selected.faces.size).toBe(0);
        changeSelection.onClick(intersections, ChangeSelectionModifier.Add, ChangeSelectionOption.None);
        expect(selectionDb.selected.faces.size).toBe(0);
    });

    test('selectionmode=object, box selecting a face of a prohibited solid will not select the object', () => {
        changeSelection = new ChangeSelectionExecutor(selectionDb, db, scene, signals, new Set([solid]));

        const face = solid.faces.get(0);
        const intersections = new Set([face]);

        expect(selectionDb.selected.solids.size).toBe(0);
        changeSelection.onBoxSelect(intersections, ChangeSelectionModifier.Add);
        expect(selectionDb.selected.solids.size).toBe(0);
    });
})
