import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../../src/commands/circle/CircleFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { RegionFactory } from '../../src/commands/region/RegionFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { ChangeSelectionModifier, SelectionMode } from '../../src/selection/ChangeSelectionExecutor';
import { SelectionConversionStrategy } from '../../src/selection/CommandRegistrar';
import { Selection, SelectionDatabase } from '../../src/selection/SelectionDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let selected: Selection;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    selectionDb = new SelectionDatabase(db, materials, signals);
    selected = selectionDb.selected;
});


export let solid: visual.Solid;
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

describe(SelectionConversionStrategy, () => {
    let transform: SelectionConversionStrategy;

    beforeEach(() => {
        transform = new SelectionConversionStrategy(selectionDb, db);
    });

    describe('convert', () => {
        test('it converts faces to edges', () => {
            const face = solid.faces.get(0);
            selected.addFace(face);
            transform.convert(SelectionMode.CurveEdge, ChangeSelectionModifier.Replace);
            expect(selected.faces.size).toBe(0);
            expect(selected.edges.size).toBe(4);
        });

        test('it converts faces to solids', () => {
            const face = solid.faces.get(0);
            selected.addFace(face);
            transform.convert(SelectionMode.Solid, ChangeSelectionModifier.Replace);
            expect(selected.faces.size).toBe(0);
            expect(selected.solids.size).toBe(1);
        });

        test('it converts solids to edges', () => {
            selected.addSolid(solid);
            transform.convert(SelectionMode.CurveEdge, ChangeSelectionModifier.Replace);
            expect(selected.edges.size).toBe(12);
        });

        test('it converts solids to faces', () => {
            selected.addSolid(solid);
            transform.convert(SelectionMode.Face, ChangeSelectionModifier.Replace);
            expect(selected.faces.size).toBe(6);
        });


        test('it converts edges to faces', () => {
            const edge = solid.edges.get(0);
            selected.addEdge(edge);
            transform.convert(SelectionMode.Face, ChangeSelectionModifier.Replace);
            expect(selected.faces.size).toBe(2);
            expect(selected.edges.size).toBe(0);
        });

        test('it converts edges to solids', () => {
            const edge = solid.edges.get(0);
            selected.addEdge(edge);
            transform.convert(SelectionMode.Solid, ChangeSelectionModifier.Replace);
            expect(selected.solids.size).toBe(1);
        });
    });
});