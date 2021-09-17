import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import CurveFactory from "../src/commands/curve/CurveFactory";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlaneSnap, PointSnap } from "../src/editor/snaps/Snap";
import { originSnap, SnapManager } from "../src/editor/snaps/SnapManager";
import * as visual from '../src/editor/VisualModel';
import { Helper } from "../src/util/Helpers";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let snaps: SnapManager;
let materials: MaterialDatabase;
let gizmos: GizmoMaterialDatabase;
let signals: EditorSignals;
let intersect: jest.Mock<any, any>;
let raycaster: THREE.Raycaster;
let camera: THREE.Camera;
let bbox: THREE.Box3;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    gizmos = new GizmoMaterialDatabase(signals);
    db = new GeometryDatabase(materials, signals);
    snaps = new SnapManager(db, gizmos, signals);
    camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    bbox = new THREE.Box3();

    intersect = jest.fn();
    raycaster = {
        intersectObjects: intersect
    } as unknown as THREE.Raycaster;
})

test("initial state", () => {
    // the origin and 3 axes
    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);
});

test("adding & removing solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);

    db.removeItem(box);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);
});

test("adding & hiding & unhiding solid", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);

    db.hide(box);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);

    db.unhide(box);

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);

    db.hide(box);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);

    db.unhideAll();

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);
});

test("adding & removing curve", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Hermit3D;
    makeLine.points.push(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps['snappers'].length).toBe(8);
    expect(snaps['nearbys'].length).toBe(4);

    db.removeItem(line);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);
});

test("adding & removing polyline points", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Polyline3D;
    makeLine.points.push(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 1, 0), new THREE.Vector3(3, 0, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps['snappers'].length).toBe(9);
    expect(snaps['nearbys'].length).toBe(5);

    db.removeItem(line);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);
});

describe("snap()", () => {
    let point: THREE.Vector3;
    const e = {} as PointerEvent;

    beforeEach(() => {
        point = new THREE.Vector3(1, 0, 0);
        // Basically, say you intersect with everything
        intersect.mockImplementation(as => as.map((a: THREE.Object3D) => {
            return {
                object: a,
                point: point
            }
        }));
    })

    test("basic behavior", async () => {
        const [{ snap, position }] = snaps.snap(raycaster);
        expect(snap).toBe(originSnap);
        expect(position).toEqual(new THREE.Vector3());
    })

    test("priority sorting of snap targets", async () => {
        const planeSnap = new PlaneSnap();
        {
            const [{ snap, position },] = snaps.snap(raycaster, [planeSnap]);
            expect(snap).toBe(originSnap);
            expect(position).toEqual(new THREE.Vector3());
        } {
            planeSnap.priority = 0;
            const [{ snap, position },] = snaps.snap(raycaster, [planeSnap]);
            expect(snap).toBe(planeSnap);
            expect(position).toEqual(point);
        }
    })

    describe("restrictions", () => {
        const pointSnap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));

        test("when no restrictions we match whatever", async () => {
            const [{ snap, position },] = snaps.snap(raycaster, [pointSnap], [], []);
            expect(snap).toBe(originSnap);
        });

        test("when restricted, only match restricted items", async () => {
            const [{ snap, position },] = snaps.snap(raycaster, [], [pointSnap], [pointSnap]);
            expect(snap).toBe(pointSnap);
            expect(position).toEqual(new THREE.Vector3(1, 1, 1));
        });

        test("when restricted, without a restriction snap", async () => {
            const result = snaps.snap(raycaster, [], [], [pointSnap]);
            expect(result.length).toBe(0);
        });


        test("snaps disabled (with ctrl key)", async () => {
            const pointSnap = new PointSnap(undefined, new THREE.Vector3(0, 0, 2));
            const planeSnap = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 2));
            // point is on the plane

            let snap;
            [{ snap, },] = snaps.snap(raycaster, [planeSnap, pointSnap], [planeSnap], [planeSnap]);
            expect(snap).toBe(pointSnap);

            snaps.toggle();

            [{ snap, }] = snaps.snap(raycaster, [planeSnap, pointSnap], [planeSnap], [planeSnap]);
            expect(snap).toBe(planeSnap);

            snaps.toggle();

            [{ snap, },] = snaps.snap(raycaster, [planeSnap, pointSnap], [planeSnap], [planeSnap]);
            expect(snap).toBe(pointSnap);
        });
    });
});

describe("nearby()", () => {
    let point: THREE.Vector3;
    const e = {} as PointerEvent;

    beforeEach(() => {
        point = new THREE.Vector3(1, 1, 1);
        // Basically, say you intersect with everything
        intersect.mockImplementation(as => as.map((a: THREE.Object3D) => {
            return {
                object: a,
                point: point
            }
        }));
    })

    test("basic behavior", async () => {
        const [pick,] = snaps.nearby(raycaster);
        expect(pick).toBeInstanceOf(THREE.Object3D);
        expect(pick.position).toEqual(originSnap.position);
    });

    test("restrictions", async () => {
        const pointSnap = new PointSnap(undefined, point);
        const [pick,] = snaps.nearby(raycaster, [pointSnap], [pointSnap]);
        expect(pick).toBeInstanceOf(Helper);
        expect(pick.position).toApproximatelyEqual(point)
    });

    test("snaps disabled (with ctrl key)", async () => {
        let nearby;
        const pointSnap = new PointSnap(undefined, point);
        snaps.toggle();
        nearby = snaps.nearby(raycaster, [pointSnap], [pointSnap]);
        expect(nearby.length).toBe(0);
        snaps.toggle();
        nearby = snaps.nearby(raycaster, [pointSnap], [pointSnap]);
        expect(nearby.length).toBe(1);
    });
});

test("saveToMemento & restoreFromMemento", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);

    const memento = snaps.saveToMemento();

    db.removeItem(box);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);

    snaps.restoreFromMemento(memento);

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);
});
