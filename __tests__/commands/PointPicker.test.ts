import * as THREE from "three";
import { GizmoMaterialDatabase } from "../../src/command/GizmoMaterials";
import { Model } from "../../src/command/PointPicker";
import { SnapIndicator } from "../../src/command/SnapIndicator";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { ConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { AxisSnap, CurveEdgeSnap, CurveEndPointSnap, CurveSnap, FaceSnap, OrRestriction, PlaneSnap, PointAxisSnap, PointSnap } from '../../src/editor/snaps/Snap';
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import { inst2curve } from "../../src/util/Conversion";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import c3d from '../build/Release/c3d.node';
import '../matchers';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

let pointPicker: Model;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let presenter: SnapIndicator;
let snaps: SnapManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    const gizmos = new GizmoMaterialDatabase(signals);
    presenter = new SnapIndicator(gizmos);
    const crosses = new CrossPointDatabase();
    const registry = new CommandRegistry();
    snaps = new SnapManager(db, crosses, signals);
    pointPicker = new Model(db, crosses, registry, signals);
});

const constructionPlane = new ConstructionPlaneSnap();

describe('restrictToPlaneThroughPoint(no snap)', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
    })


    test("restrictionFor !isOrtho", () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, false) as PlaneSnap;
        expect(restriction).toBeInstanceOf(PlaneSnap);
        expect(restriction.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(restriction.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionFor isOrtho", () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, true) as PlaneSnap;
        expect(restriction).toBeInstanceOf(PlaneSnap);
        expect(restriction.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(restriction.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("snaps", () => {
        expect(compact(pointPicker.snaps).length).toBe(0);
    })
});

describe('restrictToPlaneThroughPoint(with snap)', () => {
    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        const face = box.faces.get(0);
        const snap = new FaceSnap(face, db.lookupTopologyItem(face));
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1), snap);
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
    })

    test("restrictionFor !isOrtho", () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, false) as OrRestriction<PlaneSnap>;
        expect(restriction).toBeInstanceOf(OrRestriction);
        const plane = restriction['underlying'][0];
        expect(plane).toBeInstanceOf(PlaneSnap);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, -1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionFor isOrtho", () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, true) as ConstructionPlaneSnap;
        expect(restriction).toBeInstanceOf(ConstructionPlaneSnap);
        expect(restriction.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(restriction.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("snaps", () => {
        expect(compact(pointPicker.snaps).length).toBe(0);
    })
});

describe('addSnap', () => {
    const pointSnap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));

    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.addSnap(pointSnap);
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
    })

    test("snaps", () => {
        expect(compact(pointPicker.snaps).length).toBe(1);
        expect(compact(pointPicker.snaps)[0]).toBe(pointSnap);
    })
});

describe('toggle', () => {
    const pointSnap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));

    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.addSnap(pointSnap);
        expect(compact(pointPicker.snaps).length).toBe(1);
        expect(compact(pointPicker.snaps)[0]).toBe(pointSnap);
    })

    test("enable/disable", () => {
        expect(pointPicker.isEnabled(pointSnap)).toBe(true);
        pointPicker.toggle(pointSnap);
        expect(pointPicker.isEnabled(pointSnap)).toBe(false);
        pointPicker.toggle(pointSnap);
        expect(pointPicker.isEnabled(pointSnap)).toBe(true);
    })
})

describe('choose', () => {
    it('works when empty', () => {
        pointPicker.choose('Normal');
        expect(pointPicker.choice).toBeUndefined();
    });

    it('works when given an axis snap', () => {
        pointPicker.addAxesAt(new THREE.Vector3(1, 1, 1));
        pointPicker.choose("x");
        expect(pointPicker.choice!.snap).toBeInstanceOf(PointAxisSnap);
        expect(pointPicker.choice!.snap.name).toBe("x");
    })

    it('it clears with new point', () => {
        pointPicker.addAxesAt(new THREE.Vector3(1, 1, 1));
        pointPicker.choose("x");
        expect(pointPicker.choice!.snap.name).toBe("x");
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 1, 0),
            info: { snap: constructionPlane, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        expect(pointPicker.choice).toBe(undefined);
    })

    it('it doesn\'t clear with new point when sticky', () => {
        pointPicker.addAxesAt(new THREE.Vector3(1, 1, 1));
        pointPicker.choose("x", undefined, true);
        expect(pointPicker.choice!.snap.name).toBe("x");
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 1, 0),
            info: { snap: constructionPlane, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        expect(pointPicker.choice!.snap.name).toBe("x");
    })
});

describe('restrictToEdges', () => {
    let box: visual.Solid;
    let or: OrRestriction<CurveEdgeSnap>

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        or = pointPicker.restrictToEdges([box.edges.get(0), box.edges.get(1)]);
    })

    test("restrictionSnaps", () => {
        const restrictions = pointPicker.restrictionSnapsFor();
        expect(restrictions.length).toBe(0);
    })

    test("snaps", () => {
        expect(compact(pointPicker.snaps).length).toBe(0);
    })
});

describe('restrictToPlane', () => {
    let planeSnap: PlaneSnap;

    beforeEach(async () => {
        planeSnap = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
    });

    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.restrictToPlane(planeSnap);
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(new PlaneSnap(), false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    })

});

describe('restrictToLine', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.restrictToLine(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionSnapsFor();
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(AxisSnap);
    })

    test("snaps", () => {
        expect(compact(pointPicker.snaps).length).toBe(0);
    })

    test("choice", () => {
        expect(pointPicker.choice!.snap).toBeInstanceOf(AxisSnap);
    })
});

describe('addPickedPoint', () => {
    let circle1: visual.SpaceInstance<visual.Curve3D>;
    let model1: c3d.Curve3D;

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        circle1 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        const inst = db.lookup(circle1);
        model1 = inst2curve(inst)!;
    });

    beforeEach(() => {
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 1, 0),
            info: { snap: new CurveSnap(circle1, model1), constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionSnapsFor();
        expect(restrictions.length).toBe(0);
    })

    test("snaps", () => {
        const snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(10);
        expect(snaps.map(s => s.name).sort()).toEqual(["Binormal", "Intersection", "Intersection", "Intersection", "Intersection", "Normal", "Tangent", "x", "y", "z",]);
    })

    test("a point with intersection snaps", () => {
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 10, 0),
            info: { snap: constructionPlane, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        const snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(["Intersection", "Intersection", "x", "y", "z"]);
    })

});

describe('prefer & addPickedPoint', () => {
    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    test("prefer & preference", () => {
        pointPicker.facePreferenceMode = 'none';
        const face = box.faces.get(0);
        const snap = new FaceSnap(face, db.lookupTopologyItem(face));
        expect(pointPicker.preference).toBe(undefined);
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 10, 0),
            info: { snap, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        expect(pointPicker.preference).toBe(undefined);
    })

    test("prefer & preference", () => {
        pointPicker.facePreferenceMode = 'weak';
        const face = box.faces.get(0);
        const snap = new FaceSnap(face, db.lookupTopologyItem(face));
        expect(pointPicker.preference).toBe(undefined);
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 10, 0),
            info: { snap, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        expect(pointPicker.preference!.snap).toBe(snap);
    })

    test("!prefer & preference", () => {
        const face = box.faces.get(0);
        const snap = new FaceSnap(face, db.lookupTopologyItem(face));
        expect(pointPicker.preference).toBe(undefined);
        pointPicker.addPickedPoint({
            point: new THREE.Vector3(0, 10, 0),
            info: { snap, constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        expect(pointPicker.preference).toBe(undefined);
    })

    describe('straight snap / axis orientation', () => {
        let face: visual.Face;
        let snap: FaceSnap;
        const quat = new THREE.Quaternion().setFromUnitVectors(Z, new THREE.Vector3(1, 1, 1).normalize());

        beforeEach(() => {
            face = box.faces.get(0);
            snap = new FaceSnap(face, db.lookupTopologyItem(face));
        })

        test("with strong preference, straight snaps are oriented to the last orientation", () => {
            pointPicker.facePreferenceMode = 'strong';
            pointPicker.addPickedPoint({
                point: new THREE.Vector3(0, 10, 0),
                info: { snap, constructionPlane, orientation: quat, cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
            });
            const pointAxisSnaps = compact(pointPicker.snaps).filter(s => s instanceof PointAxisSnap) as PointAxisSnap[];
            expect(pointAxisSnaps).toHaveLength(4);
            const x = pointAxisSnaps.find(p => p.name === 'x')!;
            expect(x.n).toApproximatelyEqual(new THREE.Vector3(0.788, -0.211, -0.577));
            const y = pointAxisSnaps.find(p => p.name === 'y')!;
            expect(y.n).toApproximatelyEqual(new THREE.Vector3(-0.211, 0.788, -0.577));
            const z = pointAxisSnaps.find(p => p.name === 'z')!;
            expect(z.n).toApproximatelyEqual(new THREE.Vector3(0.577, 0.577, 0.577));
        })

        test("with weak preference, straight snaps are oriented to coordinate system", () => {
            pointPicker.facePreferenceMode = 'weak';
            const face = box.faces.get(0);
            const snap = new FaceSnap(face, db.lookupTopologyItem(face));
            const quat = new THREE.Quaternion().setFromUnitVectors(Z, new THREE.Vector3(1, 1, 1).normalize());
            pointPicker.addPickedPoint({
                point: new THREE.Vector3(0, 10, 0),
                info: { snap, constructionPlane, orientation: quat, cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
            });
            const pointAxisSnaps = compact(pointPicker.snaps).filter(s => s instanceof PointAxisSnap) as PointAxisSnap[];
            expect(pointAxisSnaps).toHaveLength(7);
            const xs = pointAxisSnaps.filter(p => p.name === 'x')!;
            expect(xs[0].n).toApproximatelyEqual(new THREE.Vector3(0.788, -0.211, -0.577));
            expect(xs[1].n).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            const ys = pointAxisSnaps.filter(p => p.name === 'y')!;
            expect(ys[0].n).toApproximatelyEqual(new THREE.Vector3(-0.211, 0.788, -0.577));
            expect(ys[1].n).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            const zs = pointAxisSnaps.filter(p => p.name === 'z')!;
            expect(zs[0].n).toApproximatelyEqual(new THREE.Vector3(0.577, 0.577, 0.577));
            expect(zs[1].n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        })

        test("with no preference, straight snaps are oriented to coordinate system", () => {
            pointPicker.facePreferenceMode = 'none';
            const face = box.faces.get(0);
            const snap = new FaceSnap(face, db.lookupTopologyItem(face));
            const quat = new THREE.Quaternion().setFromUnitVectors(Z, new THREE.Vector3(1, 1, 1).normalize());
            pointPicker.addPickedPoint({
                point: new THREE.Vector3(0, 10, 0),
                info: { snap, constructionPlane, orientation: quat, cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
            });
            const pointAxisSnaps = compact(pointPicker.snaps).filter(s => s instanceof PointAxisSnap) as PointAxisSnap[];
            const x = pointAxisSnaps.find(p => p.name === 'x')!;
            expect(x.n).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            const y = pointAxisSnaps.find(p => p.name === 'y')!;
            expect(y.n).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            const z = pointAxisSnaps.find(p => p.name === 'z')!;
            expect(z.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        })
    })
})

describe('addAxesAt', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
        pointPicker.addAxesAt(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(1, 1, 1)));
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnapsFor().length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane).toBe(constructionPlane);
    })

    test("snaps", () => {
        const snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(3);
        expect(snaps[0]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[1]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[2]).toBeInstanceOf(PointAxisSnap);

        let axisSnap;

        axisSnap = snaps[0] as AxisSnap;
        expect(axisSnap.n).toApproximatelyEqual(new THREE.Vector3(0.667, -0.667, -0.333));
        expect(axisSnap.o).toApproximatelyEqual(new THREE.Vector3());

        axisSnap = snaps[1] as AxisSnap;
        expect(axisSnap.n).toApproximatelyEqual(new THREE.Vector3(0.667, 0.333, 0.667));
        expect(axisSnap.o).toApproximatelyEqual(new THREE.Vector3());

        axisSnap = snaps[2] as AxisSnap;
        expect(axisSnap.n).toApproximatelyEqual(new THREE.Vector3(-0.333, -0.667, 0.667));
        expect(axisSnap.o).toApproximatelyEqual(new THREE.Vector3());
    })

});

describe('activateSnapped', () => {
    let curve: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(3, 3, 0));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>
    });

    beforeEach(() => {
        let snaps;
        snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(0);
    })

    test("for pointsnaps, adds axes", () => {
        const snap = new PointSnap("Closed", new THREE.Vector3(1, 2, 3));
        pointPicker.activateSnapped([snap], { isOrthoMode: false, constructionPlane });
        const snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(['x', 'y', 'z']);

        const pointAxisSnaps = compact(pointPicker.snaps).filter(s => s instanceof PointAxisSnap) as PointAxisSnap[];
        const x = pointAxisSnaps.find(p => p.name === 'x')!;
        expect(x.n).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
        const y = pointAxisSnaps.find(p => p.name === 'y')!;
        expect(y.n).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
        const z = pointAxisSnaps.find(p => p.name === 'z')!;
        expect(z.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    });

    test("for pointsnaps, isOrtho=true, adds axes oriented to construction plane", () => {
        const snap = new PointSnap("Closed", new THREE.Vector3(1, 2, 3));
        pointPicker.activateSnapped([snap], { isOrthoMode: true, constructionPlane: new ConstructionPlaneSnap(new THREE.Vector3(1, 1, 1).normalize()) });
        const snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(['x', 'y', 'z']);

        const pointAxisSnaps = compact(pointPicker.snaps).filter(s => s instanceof PointAxisSnap) as PointAxisSnap[];
        const x = pointAxisSnaps.find(p => p.name === 'x')!;
        expect(x.n).toApproximatelyEqual(new THREE.Vector3(Math.SQRT1_2, -Math.SQRT1_2, 0));
        const y = pointAxisSnaps.find(p => p.name === 'y')!;
        expect(y.n).toApproximatelyEqual(new THREE.Vector3(-0.408, -0.408, 0.816));
        const z = pointAxisSnaps.find(p => p.name === 'z')!;
        expect(z.n).toApproximatelyEqual(new THREE.Vector3(-0.577, -0.577, -0.577));
    });

    test("for endpoints on polycurves, activateSnapped adds axes as well as tangent/etc", async () => {
        const inst = db.lookup(curve) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Curve3D>(item.IsA());
        const curveSnap = new CurveSnap(curve, model);
        const snap = new CurveEndPointSnap(undefined, new THREE.Vector3(2, 2, 0), curveSnap, model.GetTMin());

        pointPicker.activateSnapped([snap], { isOrthoMode: false, constructionPlane });

        const snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(['Intersection', 'Intersection', 'Intersection', 'Intersection', 'Intersection', 'Tangent', 'x', 'y', 'z']);
    });

    test("activateSnapped respects undo", async () => {
        const inst = db.lookup(curve) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Curve3D>(item.IsA());
        const curveSnap = new CurveSnap(curve, model);
        const snap = new CurveEndPointSnap(undefined, new THREE.Vector3(2, 2, 0), curveSnap, model.GetTMin());

        pointPicker.activateSnapped([snap], { isOrthoMode: false, constructionPlane });

        let snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(['Intersection', 'Intersection', 'Intersection', 'Intersection', 'Intersection', 'Tangent', 'x', 'y', 'z']);

        pointPicker.undo();
        snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(0);
    });

    test('regardless of the current straightsnaps, adds XYZ axes', () => {
        pointPicker.straightSnaps.clear();
        const snap = new PointSnap("Closed", new THREE.Vector3(1, 2, 3));
        pointPicker.activateSnapped([snap], { isOrthoMode: false, constructionPlane });
        const snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name)).toEqual(['x', 'y', 'z']);
    })
});

describe('for curves', () => {
    let circle1: visual.SpaceInstance<visual.Curve3D>;
    let model1: c3d.Curve3D;

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        circle1 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        const inst = db.lookup(circle1);
        model1 = inst2curve(inst)!;
    });

    let circle2: visual.SpaceInstance<visual.Curve3D>;
    let model2: c3d.Curve3D;

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3(5, 0, 0);
        makeCircle.radius = 1;
        circle2 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        const inst = db.lookup(circle2);
        const item = inst.GetSpaceItem()!;
        model2 = item.Cast<c3d.Curve3D>(item.IsA());
    });

    test("activateMutualSnaps adds tan/tan", () => {
        let snaps;
        snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(0);

        pointPicker.addPickedPoint({
            point: new THREE.Vector3(5, 1, 0),
            info: { snap: new CurveSnap(circle2, model2), constructionPlane, orientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), cameraOrientation: new THREE.Quaternion() }
        });
        snaps = compact(pointPicker.snaps);
        expect(snaps.length).toBe(10);

        const snap = new CurveSnap(circle1, model1);
        pointPicker.activateMutualSnaps([snap]);

        snaps = compact(pointPicker.snaps);
        expect(snaps.map(s => s.name).sort()).toEqual(["Binormal", "Intersection", "Intersection", "Intersection", "Intersection", "Normal", "Tan/Tan", "Tan/Tan", "Tan/Tan", "Tan/Tan", "Tangent", "Tangent", "Tangent", "x", "y", "z"]);
    });
});

describe('restrictionFor', () => {
    test('isOrtho=false', () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, false) as OrRestriction<PlaneSnap>;
        expect(restriction).toBe(undefined);
    })

    test('isOrtho=true, all points snap to construction plane', () => {
        const restriction = pointPicker.restrictionFor(constructionPlane, true) as OrRestriction<PlaneSnap>;
        expect(restriction).toBe(constructionPlane);
    })
})

function compact(snaps: Model['snaps']) {
    const { disabled, snapsForLastPickedPoint, activatedSnaps, otherAddedSnaps } = snaps;
    const all = [
        ...snapsForLastPickedPoint.other, ...otherAddedSnaps.other, ...activatedSnaps.other,
        ...snapsForLastPickedPoint.points, ...otherAddedSnaps.points, ...activatedSnaps.points,
    ].filter(item => !disabled.has(item));
    return all;
}