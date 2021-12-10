import * as THREE from 'three';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { ChangeSelectionModifier, SelectionModeAll } from "../../src/selection/ChangeSelectionExecutor";
import { ClickStrategy } from "../../src/selection/Click";
import { SelectionDatabase, ToggleableSet } from "../../src/selection/SelectionDatabase";
import { Intersection } from '../../src/visual_model/Intersectable';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let click: ClickStrategy;
let modes: ToggleableSet;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let db: GeometryDatabase;
let materials: MaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    modes = new ToggleableSet(SelectionModeAll, signals);
    db = new GeometryDatabase(materials, signals);
    selectionDb = new SelectionDatabase(db, materials, signals);
    click = new ClickStrategy(modes, selectionDb.selected, selectionDb.hovered);
})

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

let intersections: Intersection[]
beforeEach(() => {
    intersections = [];
});

describe('curves', () => {
    beforeEach(() => {
        expect(selectionDb.selected.curves.size).toBe(0);
    })
    
    test('when curve mode off, has no effect', () => {
        modes.clear();
        click.curve3D(curve.underlying, ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.curves.size).toBe(0);
    })

    test('when curve mode on, selects', () => {
        click.curve3D(curve.underlying, ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.curves.size).toBe(1);
    });
});

describe('solids', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })
    
    test('when solid mode off, has no effect', () => {
        modes.clear();
        click.solid(solid.faces.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.solids.size).toBe(0);
    })

    test('when solid mode on, selects', () => {
        click.solid(solid.faces.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.solids.size).toBe(1);
    });
});

describe('faces', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })
    
    test('when face mode off, has no effect', () => {
        modes.clear();
        click.topologicalItem(solid.faces.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.faces.size).toBe(0);
    })

    test('when face mode on, selects', () => {
        click.topologicalItem(solid.faces.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.faces.size).toBe(1);
    });
});

describe('edges', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })
    
    test('when edge mode off, has no effect', () => {
        modes.clear();
        click.topologicalItem(solid.edges.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.edges.size).toBe(0);
    })

    test('when edge mode on, selects', () => {
        click.topologicalItem(solid.edges.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.edges.size).toBe(1);
    });
});

describe('region', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })
    
    test('when face mode off, has no effect', () => {
        modes.clear();
        click.region(region.underlying, ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.regions.size).toBe(0);
    })

    test('when face mode on, selects', () => {
        click.region(region.underlying, ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.regions.size).toBe(1);
    });
});

describe('control points', () => {
    beforeEach(() => {
        expect(selectionDb.selected.solids.size).toBe(0);
    })
    
    test('when point mode off, has no effect', () => {
        modes.clear();
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.controlPoints.size).toBe(0);
    })

    test('when point mode on, selects', () => {
        click.controlPoint(curve.underlying.points.get(0), ChangeSelectionModifier.Replace);
        expect(selectionDb.selected.controlPoints.size).toBe(1);
    });
});