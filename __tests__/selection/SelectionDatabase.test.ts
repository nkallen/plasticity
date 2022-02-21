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
import { ChangeSelectionExecutor } from '../../src/selection/ChangeSelectionExecutor';
import { Selection, SelectionDatabase } from '../../src/selection/SelectionDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let changeSelection: ChangeSelectionExecutor;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    selectionDb = new SelectionDatabase(db, materials, signals);
    changeSelection = new ChangeSelectionExecutor(selectionDb, db, signals);
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

describe(Selection, () => {
    let selection: Selection;

    beforeEach(() => {
        const sigs = {
            objectRemovedFromDatabase: signals.objectRemoved,
            objectAdded: signals.objectSelected,
            objectRemoved: signals.objectDeselected,
            selectionChanged: signals.selectionChanged
        };
        selection = new Selection(db, sigs as any);
    });

    test("add & remove solid", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(0);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);
    });

    test("add solid twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);
    });

    test("remove solid twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        selection.addSolid(solid);
        expect(selection.solids.first).toBe(solid);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);

        selection.removeSolid(solid);
        expect(selection.solids.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);
    });

    test("add face twice", async () => {
        const objectAdded = jest.spyOn(signals.objectSelected, 'dispatch');
        const objectRemoved = jest.spyOn(signals.objectDeselected, 'dispatch');

        const face = solid.faces.get(0);

        selection.addFace(face);
        expect(selection.faces.first).toBe(face);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        expect(selection.hasSelectedChildren(solid)).toBe(true);

        selection.addFace(face);
        expect(selection.faces.first).toBe(face);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(0);

        expect(selection.hasSelectedChildren(solid)).toBe(true);

        selection.removeFace(face);
        expect(selection.faces.first).toBe(undefined);
        expect(objectAdded).toHaveBeenCalledTimes(1);
        expect(objectRemoved).toHaveBeenCalledTimes(1);

        expect(selection.hasSelectedChildren(solid)).toBe(false);
    });

    test("removeAll", () => {
        const face = solid.faces.get(0);
        selection.addFace(face);
        expect(selection.faces.size).toBe(1);
        selection.removeAll();
        expect(selection.faces.size).toBe(0);
    })
});
