import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import CurveFactory from "../src/commands/curve/CurveFactory";
import FilletFactory from "../src/commands/fillet/FilletFactory";
import { MoveItemFactory } from "../src/commands/translate/TranslateItemFactory";
import { CrossPointDatabase } from "../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../src/editor/EditorSignals';
import { Empties } from "../src/editor/Empties";
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { Images } from "../src/editor/Images";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../src/editor/MeshCreator";
import { Scene } from "../src/editor/Scene";
import { SnapManager } from "../src/editor/snaps/SnapManager";
import { SolidCopier } from "../src/editor/SolidCopier";
import { TypeManager } from "../src/editor/TypeManager";
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let scene: Scene;
let snaps: SnapManager;
let materials: MaterialDatabase;
let signals: EditorSignals;
let intersect: jest.Mock<any, any>;
let raycaster: THREE.Raycaster;
let camera: THREE.Camera;
let bbox: THREE.Box3;
let types: TypeManager;
let images: Images;
let empties: Empties;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    images = new Images();
    empties = new Empties(images, signals);
    scene = new Scene(db, empties, materials, signals);
    camera = new THREE.PerspectiveCamera();
    types = scene.types;
    snaps = new SnapManager(db, scene, new CrossPointDatabase(), signals);
    camera.position.set(0, 0, 1);
    bbox = new THREE.Box3();

    intersect = jest.fn();
    raycaster = {
        intersectObjects: intersect
    } as unknown as THREE.Raycaster;
})

afterEach(() => {
    snaps.validate();
})

test("initial state", () => {
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);
});

test("adding & removing solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    db.removeItem(box);

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);
});

test("adding and editing a solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;
    snaps.validate();

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    const makeFillet = new FilletFactory(db, materials, signals);
    makeFillet.solid = box;
    makeFillet.edges = [box.edges.get(0)];
    makeFillet.distance = 0.1;
    const fillet = await makeFillet.commit() as visual.Solid;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(58);
    snaps.validate();
})

test("adding & hiding & removing solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    scene.makeHidden(box, true);
    snaps.validate();

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    db.removeItem(box);
});

test("adding & hiding & unhiding solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    scene.makeHidden(box, true);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    scene.makeHidden(box, false);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    scene.makeHidden(box, true);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    await scene.unhideAll();
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);
});

test("hiding is idempotent", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    scene.makeHidden(box, true);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    scene.makeHidden(box, true);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    scene.makeHidden(box, false);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);
});

test("adding & removing curve", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Hermit3D;
    makeLine.points.push(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(2);

    db.removeItem(line);

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);
});

test("adding & removing polyline points", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Polyline3D;
    makeLine.points.push(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(3, 0, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(7);

    db.removeItem(line);

    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);
});

test("enabling and disabling types adds/removes snaps", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Polyline3D;
    makeLine.points.push(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(3, 0, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps.all.geometrySnaps[0].size).toBe(7);

    types.disable(visual.Curve3D);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    types.enable(visual.Curve3D);
    expect(snaps.all.geometrySnaps[0].size).toBe(7);
});

test("xor enabled=true", () => {
    snaps.enabled = true;
    snaps.xor = true;
    expect(snaps.enabled).toBe(false);
    snaps.xor = false;
    expect(snaps.enabled).toBe(true);
})

test("xor enabled=false", () => {
    snaps.enabled = false;
    snaps.xor = true;
    expect(snaps.enabled).toBe(true);
    snaps.xor = false;
    expect(snaps.enabled).toBe(false);
})

describe('undo', () => {
    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    })

    test('it works', async () => {
        const snaps_memento = snaps.saveToMemento();
        const db_memento = db.saveToMemento();
        const before = [...snaps.all.geometrySnaps].map(set => [...set].map(p => p.position)).flat();
        expect(before.length).toBe(42);

        const move = new MoveItemFactory(db, materials, signals);
        move.items = [box];
        move.move = new THREE.Vector3(1, 1, 1);
        await move.commit();

        const after = [...snaps.all.geometrySnaps].map(set => [...set].map(p => p.position)).flat();
        expect(after.length).toBe(42);
        expect(after).not.toEqual(before);

        db.restoreFromMemento(db_memento);
        snaps.restoreFromMemento(snaps_memento);
        const afterUndo = [...snaps.all.geometrySnaps].map(set => [...set].map(p => p.position)).flat();
        expect(afterUndo.length).toBe(42);
        expect(afterUndo).toEqual(before);
    })
})
