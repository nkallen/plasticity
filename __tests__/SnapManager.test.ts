import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import CurveFactory from "../src/commands/curve/CurveFactory";
import { CrossPointDatabase } from "../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../src/editor/MeshCreator";
import { SnapManager } from "../src/editor/snaps/SnapManager";
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let snaps: SnapManager;
let materials: MaterialDatabase;
let signals: EditorSignals;
let intersect: jest.Mock<any, any>;
let raycaster: THREE.Raycaster;
let camera: THREE.Camera;
let bbox: THREE.Box3;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    snaps = new SnapManager(db, new CrossPointDatabase(), signals);
    camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    bbox = new THREE.Box3();

    intersect = jest.fn();
    raycaster = {
        intersectObjects: intersect
    } as unknown as THREE.Raycaster;
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

    db.hide(box);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    db.unhide(box);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(1);
    expect(snaps.all.geometrySnaps[0].size).toBe(42);

    db.hide(box);
    expect(snaps.all.basicSnaps.size).toBe(4);
    expect(snaps.all.crossSnaps.length).toBe(0);
    expect(snaps.all.geometrySnaps.length).toBe(0);

    db.unhideAll();
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
