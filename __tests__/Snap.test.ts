import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import LineFactory from "../src/commands/line/LineFactory";
import { CrossPointDatabase } from "../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, Layers, LineSnap, OrRestriction, PlaneSnap, PointSnap, TanTanSnap } from "../src/editor/snaps/Snap";
import { SnapManager } from "../src/editor/snaps/SnapManager";
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
    snaps = new SnapManager(db, new CrossPointDatabase(), signals);
    camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    bbox = new THREE.Box3();

    intersect = jest.fn();
    raycaster = {
        intersectObjects: intersect
    } as unknown as THREE.Raycaster;
})

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

        snaps.layers.set(Layers.CurveEdge);

        const [{ snap: match, position }] = snaps.snap(raycaster, [], [snap]);

        expect((match as CurveEdgeSnap).view.simpleName).toBe(snap.view.simpleName);
        expect(position).toApproximatelyEqual(new THREE.Vector3())
    })
})

describe(CurveSnap, () => {
    let line: visual.SpaceInstance<visual.Curve3D>;
    let snap: CurveSnap;

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

        snaps.layers.set(Layers.Curve);

        const [{ snap: match, position }] = snaps.snap(raycaster, [], [snap]);

        expect((match as CurveSnap).view.simpleName).toBe(snap.view.simpleName);
        expect(position).toApproximatelyEqual(new THREE.Vector3())
    });

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

    test('additionalSnapsForLast', () => {
        let result;
        result = snap.additionalSnapsForLast(new THREE.Vector3(0, 10, 0), new PlaneSnap());
        expect(result.length).toBe(1);
        expect(result[0]).toBeInstanceOf(PointSnap);
        expect(result[0].name).toBe("Tangent");

        result = snap.additionalSnapsForLast(new THREE.Vector3(0, 10, 10), new PlaneSnap());
        expect(result.length).toBe(0);
    });

    test('additionalSnapsForLast when given a coplanar curve snap', async () => {
        let snap1: CurveSnap;
        let snap2: CurveSnap;
        {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3(-2, 0, 0);
            makeCircle.radius = 1;
            const circle1 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(circle1);
            const item = inst.GetSpaceItem()!;
            const model1 = item.Cast<c3d.Curve3D>(item.IsA());
            snap1 = new CurveSnap(circle1, model1);
        }

        {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3(2, 0, 0);
            makeCircle.radius = 1;
            const circle2 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(circle2);
            const item = inst.GetSpaceItem()!;
            const model2 = item.Cast<c3d.Curve3D>(item.IsA());
            snap2 = new CurveSnap(circle2, model2);
        }

        const snaps = snap1.additionalSnapsForLast(new THREE.Vector3(), snap2);
        expect(snaps.length).toBe(6);
        expect(snaps[2]).toBeInstanceOf(TanTanSnap);
        expect(snaps[3]).toBeInstanceOf(TanTanSnap);
        let tantan = snaps[2] as TanTanSnap;
        expect(tantan.point1).toApproximatelyEqual(new THREE.Vector3(2, -1, 0));
        expect(tantan.point2).toApproximatelyEqual(new THREE.Vector3(-2, -1, 0));
        tantan = snaps[3] as TanTanSnap;
        expect(tantan.point1).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
        expect(tantan.point2).toApproximatelyEqual(new THREE.Vector3(-2, 1, 0));
    });
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

        snaps.layers.set(Layers.Face);

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
});

describe("Experiment", () => {
    test("it works", () => {

    })
});