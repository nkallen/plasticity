import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../../src/commands/circle/CircleFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { RegionFactory } from '../../src/commands/region/RegionFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Groups, Group } from '../../src/editor/Groups';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Scene } from '../../src/editor/Scene';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { ChangeSelectionExecutor } from '../../src/selection/ChangeSelectionExecutor';
import { Selection, SelectionDatabase, SignalLike } from '../../src/selection/SelectionDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selectionDb: SelectionDatabase;
let changeSelection: ChangeSelectionExecutor;
let scene: Scene;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    selectionDb = new SelectionDatabase(db, materials, signals);
    changeSelection = new ChangeSelectionExecutor(selectionDb, db, signals);
    scene = new Scene(db, materials, signals);
});


export let solid: visual.Solid;
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

describe(Selection, () => {
    let selection: Selection;

    beforeEach(() => {
        const sigs: SignalLike = {
            objectRemovedFromDatabase: signals.objectRemoved,
            groupRemoved: signals.groupDeleted,
            objectHidden: signals.objectHidden,
            objectUnselectable: signals.objectUnselectable,
            objectReplaced: signals.objectReplaced,
            objectAdded: signals.objectSelected,
            objectRemoved: signals.objectDeselected,
            selectionChanged: signals.selectionChanged
        };
        selection = new Selection(db, sigs);
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

    test("deleting an object removes face selection", async () => {
        const face = solid.faces.get(0);
        selection.addFace(face);
        expect(selection.faces.first).toBe(face);
        await db.removeItem(solid);
        expect(selection.faces.size).toBe(0);
    });

    test("removeAll", () => {
        const face = solid.faces.get(0);
        selection.addFace(face);
        selection.addGroup(group);
        const point = curve.underlying.points.get(0);
        selection.addControlPoint(point);
        expect(selection.faces.size).toBe(1);
        expect(selection.groups.size).toBe(1);
        expect(selection.controlPoints.size).toBe(1);
        selection.removeAll();
        expect(selection.faces.size).toBe(0);
        expect(selection.groups.size).toBe(0);
        expect(selection.controlPoints.size).toBe(0);
    });

    test("add & remove region", () => {
        selection.addRegion(region);
        expect(selection.regions.size).toBe(1);
        selection.removeRegion(region);
        expect(selection.regions.size).toBe(0);
    })

    test("addGroup & removeGroup", () => {
        expect(selection.groups.size).toBe(0);
        selection.has(group);
        expect(selection.has(group)).toBe(false);

        selection.addGroup(group);
        expect(selection.groups.size).toBe(1);
        expect(selection.has(group)).toBe(true);

        selection.removeGroup(group);
        expect(selection.groups.size).toBe(0);
        expect(selection.has(group)).toBe(false);
    })

    test("add & remove group", () => {
        expect(selection.groups.size).toBe(0);
        selection.has(group);
        expect(selection.has(group)).toBe(false);

        selection.add(group);
        expect(selection.groups.size).toBe(1);
        expect(selection.has(group)).toBe(true);

        selection.remove([group]);
        expect(selection.groups.size).toBe(0);
        expect(selection.has(group)).toBe(false);
    })

    test("add & remove control point", () => {
        expect(selection.controlPoints.size).toBe(0);
        const point = curve.underlying.points.get(0);
        selection.addControlPoint(point);
        expect(selection.controlPoints.size).toBe(1);
        selection.removeControlPoint(point);
        expect(selection.controlPoints.size).toBe(0);
    });

    test("deleting curve deletes its control point", async () => {
        expect(selection.controlPoints.size).toBe(0);
        const point = curve.underlying.points.get(0);
        selection.addControlPoint(point);
        expect(selection.controlPoints.size).toBe(1);
        await db.removeItem(curve);
        expect(selection.controlPoints.size).toBe(0);
    });

    test("hiding an object removes it from the selection", async () => {
        selection.addSolid(solid);
        expect(selection.solids.size).toBe(1);
        scene.makeHidden(solid, true);
        expect(selection.solids.size).toBe(0);
    })

    test("making an object unselectable removes it from the selection", async () => {
        selection.addSolid(solid);
        expect(selection.solids.size).toBe(1);
        scene.makeSelectable(solid, false);
        expect(selection.solids.size).toBe(0);
    })
});
