import * as THREE from "three";
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import LineFactory from "../src/commands/line/LineFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { AxisSnap, CurveEdgeSnap, originSnap, OrRestriction, PlaneSnap, PointSnap, Raycaster, SnapManager } from '../src/editor/SnapManager';
import { SpriteDatabase } from "../src/editor/SpriteDatabase";
import * as visual from '../src/editor/VisualModel';
import { cart2vec, vec2vec } from "../src/util/Conversion";
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import './matchers';

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
    signals = new EditorSignals();
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
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
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
        const pointSnap = new PointSnap(new THREE.Vector3(1, 1, 1));
        const [[snap, p],] = snaps.snap(raycaster, [pointSnap], [pointSnap]);
        expect(snap).toBe(pointSnap);
        expect(new THREE.Vector3(1, 1, 1)).toEqual(p);
    });
});

describe("nearby()", () => {
    let point: THREE.Vector3;
    beforeEach(() => {
        point = new THREE.Vector3();
        intersect.mockImplementation(a => [{
            object: a[0],
            point: point
        }]);
    })

    test("basic behavior", async () => {
        const [pick,] = snaps.nearby(raycaster);
        expect(pick).toBe(sprites.isNear());
        expect(pick.position).toEqual(originSnap['projection']);
    });

    test("restrictions", async () => {
        const pointSnap = new PointSnap(new THREE.Vector3(1, 1, 1));
        const [pick,] = snaps.nearby(raycaster, [pointSnap], [pointSnap]);
        expect(pick).toBe(pointSnap.helper);
    });
});

test("saveToMemento & restoreFromMemento", async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
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

describe(PlaneSnap, () => {
    test("project", () => {
        let plane, i;
        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        i = { point: new THREE.Vector3(0, 0, 0) };
        expect(plane.project(i)).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
        i = { point: new THREE.Vector3(0, 0, 1) };
        expect(plane.project(i)).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    });

    test("isValid", () => {
        let plane;
        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        expect(plane.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(plane.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);

        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
        expect(plane.isValid(new THREE.Vector3(0, 0, 0))).toBe(false);
        expect(plane.isValid(new THREE.Vector3(0, 0, 1))).toBe(true);
    });

    test("placement", () => {
        let plane: PlaneSnap, placement: c3d.Placement3D;
        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        placement = plane.placement;
        expect(cart2vec(placement.GetOrigin())).toApproximatelyEqual(new THREE.Vector3());
        expect(vec2vec(placement.GetAxisZ())).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));

        plane = new PlaneSnap(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
        placement = plane.placement;
        expect(cart2vec(placement.GetOrigin())).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(vec2vec(placement.GetAxisZ())).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
    });
})

describe(AxisSnap, () => {
    test("project", () => {
        let i;
        i = { point: new THREE.Vector3(0, 0, 0) };
        expect(AxisSnap.X.project(i)).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        i = { point: new THREE.Vector3(1, 0, 0) };
        expect(AxisSnap.X.project(i)).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));

        i = { point: new THREE.Vector3(0, 1, 0) };
        expect(AxisSnap.X.project(i)).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        const moved = AxisSnap.X.move(new THREE.Vector3(0, 0, 1));
        i = { point: new THREE.Vector3(1, 0, 1) };
        expect(moved.project(i)).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
    });

    test("isValid", () => {
        expect(AxisSnap.X.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);

        expect(AxisSnap.X.isValid(new THREE.Vector3(1, 0, 0))).toBe(true);

        expect(AxisSnap.X.isValid(new THREE.Vector3(0, 1, 0))).toBe(false);
    });

    test("isValid when line is moved", () => {
        const axis = AxisSnap.Z.move(new THREE.Vector3(1, 0, 0));
        expect(axis.isValid(new THREE.Vector3(1, 0, 0))).toBe(true);
        expect(axis.isValid(new THREE.Vector3(1, 0, 1))).toBe(true);
        expect(axis.isValid(new THREE.Vector3(1, 0, 10))).toBe(true);
        expect(axis.isValid(new THREE.Vector3(1, 1, 10))).toBe(false);
    });
})

describe(OrRestriction, () => {
    test("isValid", () => {
        const or = new OrRestriction([AxisSnap.X, AxisSnap.Y]);
        expect(or.isValid(new THREE.Vector3(1, 0, 0))).toBe(true);
        expect(or.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(or.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);
    })
})

describe(CurveEdgeSnap, () => {
    let box: visual.Solid;
    let snap: CurveEdgeSnap;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0); // this is the edge from 0,0,0 to 0,1,0
        const model = db.lookupTopologyItem(edge);
        snap = new CurveEdgeSnap(edge, model);
    })

    test("project", () => {
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) })).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 0.5, 0) })).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(snap.project({ point: new THREE.Vector3(2, 1, 0) })).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0.5, 1) })).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
    })

    test("isValid", () => {
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);
    })
})

describe(PointSnap, () => {
    test("project", () => {
        let snap;
        snap = new PointSnap(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) })).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 1, 1) })).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        snap = new PointSnap(new THREE.Vector3(1, 1, 1));
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) })).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        expect(snap.project({ point: new THREE.Vector3(1, 1, 1) })).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("isValid", () => {
        let snap;
        snap = new PointSnap(new THREE.Vector3(0, 0, 0));
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 1, 1))).toBe(false);

        snap = new PointSnap(new THREE.Vector3(1, 1, 1));
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(1, 1, 1))).toBe(true);
    })
})