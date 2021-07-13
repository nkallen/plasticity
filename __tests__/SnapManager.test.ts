import * as THREE from "three";
import { isModuleBlock } from "typescript";
import BoxFactory from '../src/commands/box/BoxFactory';
import LineFactory from "../src/commands/line/LineFactory";
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { AxisSnap, originSnap, PointSnap, Raycaster, SnapManager } from '../src/SnapManager';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';

let db: GeometryDatabase;
let snaps: SnapManager;
let materials: MaterialDatabase;
let sprites: SpriteDatabase;
let signals: EditorSignals;
let intersect: jest.Mock<any, any>;
let raycaster: Raycaster;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    snaps = new SnapManager(db, sprites, signals);

    intersect = jest.fn();
    raycaster = {
        intersectObjects: intersect
    }
})

test("initial state", () => {
    // the origin and 3 axes
    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

test("adding solid", async () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);

    db.removeItem(box);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

test("adding & removing curve", async () => {
    const makeLine = new LineFactory(db, materials, signals);
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(1, 0, 0);
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps.snappers.length).toBe(7);
    expect(snaps.pickers.length).toBe(4);

    db.removeItem(line);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

describe("snap()", () => {
    let point: THREE.Vector3;
    beforeEach(() => {
        point = new THREE.Vector3(1, 0, 0);
        intersect.mockImplementation(as => as.map(a => {
            return {
                object: a,
                point: point
            }
        }));
    })

    test("basic behavior", async () => {
        const [[snap, p],] = snaps.snap(raycaster);
        expect(snap).toBe(originSnap);
        expect(p).toEqual(new THREE.Vector3());
    })

    test("restrictions", async () => {
        const pointSnap = new PointSnap(1, 1, 1);
        const [[snap, p],] = snaps.snap(raycaster, [pointSnap], [pointSnap]);
        expect(snap).toBe(pointSnap);
        expect(new THREE.Vector3(1,1,1)).toEqual(p);
    });
});

describe("pick()", () => {
    let point: THREE.Vector3;
    beforeEach(() => {
        point = new THREE.Vector3();
        intersect.mockImplementation(a => [{
            object: a[0],
            point: point
        }]);
    })

    test("basic behavior", async () => {
        const [pick,] = snaps.pick(raycaster);
        expect(pick).toBe(sprites.isNear());
        expect(pick.position).toEqual(originSnap['projection']);
    });

    test("restrictions", async () => {
        const pointSnap = new PointSnap(1, 1, 1);
        const [pick,] = snaps.pick(raycaster, [pointSnap], [pointSnap]);
        expect(pick).toBe(pointSnap.helper);
    });
});

test("saveToMemento & restoreFromMemento", async () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);

    const memento = snaps.saveToMemento(new Map());

    db.removeItem(box);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);

    snaps.restoreFromMemento(memento);

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);
});