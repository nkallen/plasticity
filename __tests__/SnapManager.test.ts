import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import CurveFactory from "../src/commands/curve/CurveFactory";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import LineFactory from "../src/commands/line/LineFactory";
import { PointPicker } from "../src/commands/PointPicker";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, Layers, LineSnap, originSnap, OrRestriction, PlaneSnap, PointSnap, SnapManager } from '../src/editor/SnapManager';
import * as visual from '../src/editor/VisualModel';
import { point2point, vec2vec } from "../src/util/Conversion";
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
        intersect.mockImplementation(as => as.map(a => {
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
        intersect.mockImplementation(as => as.map(a => {
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
        expect(pick).toBeInstanceOf(THREE.Mesh);
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

    const memento = snaps.saveToMemento(new Map());

    db.removeItem(box);

    expect(snaps['snappers'].length).toBe(4);
    expect(snaps['nearbys'].length).toBe(1);

    snaps.restoreFromMemento(memento);

    expect(snaps['snappers'].length).toBe(52);
    expect(snaps['nearbys'].length).toBe(31);
});

describe(PlaneSnap, () => {
    test("project", () => {
        let plane: PlaneSnap, i;
        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        i = { point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection;
        expect(plane.project(i).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        plane = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
        i = { point: new THREE.Vector3(0, 0, 1) } as THREE.Intersection;
        expect(plane.project(i).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    });

    test("isValid", () => {
        let plane: PlaneSnap;
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
        expect(point2point(placement.GetOrigin())).toApproximatelyEqual(new THREE.Vector3());
        expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));

        plane = new PlaneSnap(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
        placement = plane.placement;
        expect(point2point(placement.GetOrigin())).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
    });
})

describe(AxisSnap, () => {
    test("project", () => {
        let i: THREE.Intersection;
        i = { point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection;
        expect(AxisSnap.X.project(i).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        i = { point: new THREE.Vector3(1, 0, 0) } as THREE.Intersection;
        expect(AxisSnap.X.project(i).position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));

        i = { point: new THREE.Vector3(0, 1, 0) } as THREE.Intersection;
        expect(AxisSnap.X.project(i).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        const moved = AxisSnap.X.move(new THREE.Vector3(0, 0, 1));
        i = { point: new THREE.Vector3(1, 0, 1) } as THREE.Intersection;
        expect(moved.project(i).position).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
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

describe(LineSnap, () => {
    test("isValid", () => {
        let line: LineSnap;
        line = LineSnap.make(undefined, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        expect(line.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(line.isValid(new THREE.Vector3(1, 0, 0))).toBe(true);
        expect(line.isValid(new THREE.Vector3(0, 0, 1))).toBe(true);
        expect(line.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);

        line = LineSnap.make(undefined, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
        expect(line.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(line.isValid(new THREE.Vector3(1, 1, 0))).toBe(true);
        expect(line.isValid(new THREE.Vector3(0, 1, 1))).toBe(true);
        expect(line.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
    });

    test("project", () => {
        let line: LineSnap;
        line = LineSnap.make(undefined, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
        expect(line.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(line.project({ point: new THREE.Vector3(1, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(line.project({ point: new THREE.Vector3(0, 0, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
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
    const e = {} as PointerEvent;

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
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 0.5, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(snap.project({ point: new THREE.Vector3(2, 1, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0.5, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
    })

    test("isValid", () => {
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);
    })

    test("integration (snap with restriction to edge)", () => {
        const raycaster = new THREE.Raycaster();
        bbox.setFromObject(snap.snapper);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        camera.lookAt(center);
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);

        snaps.layers.set(Layers.CurveEdgeSnap);

        const [{ snap: match, position }] = snaps.snap(raycaster, [], [snap]);

        expect((match as CurveEdgeSnap).view.simpleName).toBe(snap.view.simpleName);
        expect(position).toApproximatelyEqual(new THREE.Vector3())
    })
})

describe(CurveSnap, () => {
    let line: visual.SpaceInstance<visual.Curve3D>;
    let snap: CurveSnap;
    const e = {} as PointerEvent;

    beforeEach(async () => {
        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(0, 1, 0);
        line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        const inst = db.lookup(line) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem()!;
        snap = new CurveSnap(line, item.Cast(item.IsA()));
    })

    test("project", () => {
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 0.5, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
        expect(snap.project({ point: new THREE.Vector3(2, 1, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0.5, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
    })

    test("isValid", () => {
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);
    })

    test("integration (snap with restriction to curve)", () => {
        const raycaster = new THREE.Raycaster();
        bbox.setFromObject(snap.snapper);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        camera.lookAt(center);
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);

        snaps.layers.set(Layers.CurveSnap);

        const [{ snap: match, position }] = snaps.snap(raycaster, [], [snap]);

        expect((match as CurveSnap).view.simpleName).toBe(snap.view.simpleName);
        expect(position).toApproximatelyEqual(new THREE.Vector3())
    })

    describe("addAdditionalSnapsTo", () => {
        test("when curvy", async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.points.push(new THREE.Vector3());
            makeCurve.points.push(new THREE.Vector3(0, 1, 0));
            makeCurve.points.push(new THREE.Vector3(1, 2, 0));
            const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(curve) as c3d.SpaceInstance;
            const item = inst.GetSpaceItem()!;
            const snap = new CurveSnap(curve, item.Cast(item.IsA()));

            const additional = snap.additionalSnapsFor(new THREE.Vector3(0, 1, 0));

            expect(additional[0]).toBeInstanceOf(AxisSnap);
            expect(additional[1]).toBeInstanceOf(AxisSnap);
            expect(additional[2]).toBeInstanceOf(AxisSnap);

            expect(additional[0].n).toApproximatelyEqual(new THREE.Vector3(0.945, -0.316, 0));
            expect(additional[0].o).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));

            expect(additional[1].n).toApproximatelyEqual(new THREE.Vector3(0, 0, -1));
            expect(additional[1].o).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));

            expect(additional[2].n).toApproximatelyEqual(new THREE.Vector3(0.316, 0.948, 0));
            expect(additional[2].o).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        })

        test("when straight along X", async () => {
            const makeLine = new LineFactory(db, materials, signals);
            makeLine.p1 = new THREE.Vector3();
            makeLine.p2 = new THREE.Vector3(1, 0, 0);
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(line) as c3d.SpaceInstance;
            const item = inst.GetSpaceItem()!;
            const snap = new CurveSnap(line, item.Cast(item.IsA()));

            const additional = snap.additionalSnapsFor(makeLine.p2);

            expect(additional[0]).toBeInstanceOf(AxisSnap);
            expect(additional[1]).toBeInstanceOf(AxisSnap);
            expect(additional[2]).toBeInstanceOf(AxisSnap);

            expect(additional[0].n).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
            expect(additional[0].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[1].n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
            expect(additional[1].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[2].n).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(additional[2].o).toApproximatelyEqual(makeLine.p2);
        })

        test("when straight along Y", async () => {
            const makeLine = new LineFactory(db, materials, signals);
            makeLine.p1 = new THREE.Vector3();
            makeLine.p2 = new THREE.Vector3(0, 1, 0);
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(line) as c3d.SpaceInstance;
            const item = inst.GetSpaceItem()!;
            const snap = new CurveSnap(line, item.Cast(item.IsA()));

            const additional = snap.additionalSnapsFor(makeLine.p2);

            expect(additional[0]).toBeInstanceOf(AxisSnap);
            expect(additional[1]).toBeInstanceOf(AxisSnap);
            expect(additional[2]).toBeInstanceOf(AxisSnap);

            expect(additional[0].n).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(additional[0].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[1].n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
            expect(additional[1].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[2].n).toApproximatelyEqual(makeLine.p2);
            expect(additional[2].o).toApproximatelyEqual(makeLine.p2);
        })

        test("when straight along Z", async () => {
            const makeLine = new LineFactory(db, materials, signals);
            makeLine.p1 = new THREE.Vector3();
            makeLine.p2 = new THREE.Vector3(0, 0, 1);
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(line) as c3d.SpaceInstance;
            const item = inst.GetSpaceItem()!;
            const snap = new CurveSnap(line, item.Cast(item.IsA()));

            const additional = snap.additionalSnapsFor(makeLine.p2);

            expect(additional[0]).toBeInstanceOf(AxisSnap);
            expect(additional[1]).toBeInstanceOf(AxisSnap);
            expect(additional[2]).toBeInstanceOf(AxisSnap);

            expect(additional[0].n).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
            expect(additional[0].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[1].n).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(additional[1].o).toApproximatelyEqual(makeLine.p2);

            expect(additional[2].n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
            expect(additional[2].o).toApproximatelyEqual(makeLine.p2);
        })
    })
})

describe(FaceSnap, () => {
    let box: visual.Solid;
    let snap: FaceSnap;
    const e = {} as PointerEvent;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        const face = box.faces.get(0); // bottom face
        const model = db.lookupTopologyItem(face);
        snap = new FaceSnap(face, model);
    })

    test("project", () => {
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 0.5, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(1, 0.5, 0));
        expect(snap.project({ point: new THREE.Vector3(2, 1, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0.5, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0));
    })

    test("isValid", () => {
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(0, 1, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(10, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(0, 0, 1))).toBe(false);
    })

    test("integration", () => {
        const face = box.faces.get(1);
        const raycaster = new THREE.Raycaster();
        bbox.setFromObject(face);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        camera.lookAt(center);
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);

        snaps.layers.set(Layers.FaceSnap);

        // NOTE: the face is automatically added to the snapman via signals
        const [{ snap: match, position }] = snaps.snap(raycaster, [], []);
        expect(match).toBeInstanceOf(FaceSnap);
        const expectation = match as FaceSnap;
        expect(expectation.view).toBe(face);
        expect(position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1))
    })
})

describe(PointSnap, () => {
    test("project", () => {
        let snap: PointSnap;
        snap = new PointSnap(undefined, new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(snap.project({ point: new THREE.Vector3(1, 1, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));

        snap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));
        expect(snap.project({ point: new THREE.Vector3(0, 0, 0) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        expect(snap.project({ point: new THREE.Vector3(1, 1, 1) } as THREE.Intersection).position).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("isValid", () => {
        let snap: PointSnap;
        snap = new PointSnap(undefined, new THREE.Vector3(0, 0, 0));
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(true);
        expect(snap.isValid(new THREE.Vector3(1, 1, 1))).toBe(false);

        snap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));
        expect(snap.isValid(new THREE.Vector3(0, 0, 0))).toBe(false);
        expect(snap.isValid(new THREE.Vector3(1, 1, 1))).toBe(true);
    })
})