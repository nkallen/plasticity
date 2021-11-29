import { inst2curve } from "../../src/util/Conversion";
import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { Model, Presentation } from '../../src/commands/PointPicker';
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { AxisAxisCrossPointSnap, AxisSnap, CurveEdgeSnap, CurveEndPointSnap, CurvePointSnap, CurveSnap, LineSnap, OrRestriction, PlaneSnap, PointAxisSnap, PointSnap, TanTanSnap } from '../../src/editor/snaps/Snap';
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import { SnapPresenter } from "../../src/editor/snaps/SnapPresenter";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import c3d from '../build/Release/c3d.node';
import '../matchers';

let pointPicker: Model;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let snaps: SnapManager;
let presenter: SnapPresenter;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    const gizmos = new GizmoMaterialDatabase(signals);
    presenter = new SnapPresenter(gizmos);
    const crosses = new CrossPointDatabase();
    snaps = new SnapManager(db, crosses, signals);
    const registry = new CommandRegistry();
    pointPicker = new Model(db, crosses, registry, signals);
});

describe('restrictToPlaneThroughPoint', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("snaps", () => {
        expect(pointPicker.snaps.length).toBe(0);
    })
});

describe('addSnap', () => {
    const pointSnap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        pointPicker.addSnap(pointSnap);
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
    })

    test("snaps", () => {
        expect(pointPicker.snaps.length).toBe(1);
        expect(pointPicker.snaps[0]).toBe(pointSnap);
    })
});

describe('choose', () => {
    it('works when empty', () => {
        pointPicker.choose('Normal');
        expect(pointPicker.choice).toBeUndefined();
    });

    it('works when given an axis snap', () => {
        pointPicker.addAxesAt(new THREE.Vector3(1, 1, 1));
        pointPicker.choose("x");
        expect(pointPicker.choice).toBeInstanceOf(PointAxisSnap);
        expect(pointPicker.choice!.name).toBe("x");
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
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        or = pointPicker.restrictToEdges([box.edges.get(0), box.edges.get(1)]);
    })

    test("restrictionSnaps", () => {
        const restrictions = pointPicker.restrictionSnaps;
        expect(restrictions.length).toBe(2);
        expect(restrictions[0]).toBeInstanceOf(CurveEdgeSnap);
        expect(restrictions[1]).toBeInstanceOf(CurveEdgeSnap);
    })

    test("snaps", () => {
        expect(pointPicker.snaps.length).toBe(0);
    })
});

describe('restrictToPlane', () => {
    let planeSnap: PlaneSnap;

    beforeEach(async () => {
        planeSnap = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
    });

    beforeEach(() => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        pointPicker.restrictToPlane(planeSnap);
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(new PlaneSnap(), false);
        expect(plane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(plane.p).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    })

});

describe('restrictToLine', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        pointPicker.restrictToLine(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionSnaps;
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(LineSnap);
    })

    test("snaps", () => {
        expect(pointPicker.snaps.length).toBe(0);
    })
});

describe('addPickedPoint', () => {
    const constructionPlane = new PlaneSnap();
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
            info: { snap: new CurveSnap(circle1, model1), constructionPlane }
        });
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionSnaps;
        expect(restrictions.length).toBe(0);
    })

    test("snaps", () => {
        const snaps = pointPicker.snaps;
        expect(snaps.length).toBe(6);
        expect(snaps[0].name).toBe("x");
        expect(snaps[1].name).toBe("y");
        expect(snaps[2].name).toBe("z");
        expect(snaps[3].name).toBe("Normal");
        expect(snaps[4].name).toBe("Binormal");
        expect(snaps[5].name).toBe("Tangent");
    })
})

const Y = new THREE.Vector3(0, 1, 0);

describe('addAxesAt', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
        pointPicker.addAxesAt(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(1, 1, 1)));
    })

    test("restrictionSnaps", () => {
        expect(pointPicker.restrictionSnaps.length).toBe(0);
    })

    test("actualContructionPlaneGiven", () => {
        const plane = pointPicker.actualConstructionPlaneGiven(constructionPlane, false);
        expect(plane).toBe(constructionPlane);
    })

    test("snaps", () => {
        const snaps = pointPicker.snaps;
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
        snaps = pointPicker.snaps;
        expect(snaps.length).toBe(0);
    })

    test("for pointsnaps, adds axes", () => {
        const snap = new PointSnap("Closed", new THREE.Vector3(1, 2, 3));
        pointPicker.activateSnapped([snap]);
        const snaps = pointPicker.snaps;
        expect(snaps.length).toBe(3);
        expect(snaps[0]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[1]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[2]).toBeInstanceOf(PointAxisSnap);
    });

    test("for endpoints on polycurves, activateSnapped adds axes as well as tangent/etc", async () => {
        const inst = db.lookup(curve) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Curve3D>(item.IsA());
        const curveSnap = new CurveSnap(curve, model);
        const snap = new CurveEndPointSnap(undefined, new THREE.Vector3(2, 2, 0), curveSnap, model.GetTMin());

        pointPicker.activateSnapped([snap]);

        const snaps = pointPicker.snaps;
        expect(snaps.length).toBe(4);
        expect(snaps[0]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[1]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[2]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[3]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[3].name).toEqual("Tangent")
    });

    test("activateSnapped respects undo", async () => {
        const inst = db.lookup(curve) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Curve3D>(item.IsA());
        const curveSnap = new CurveSnap(curve, model);
        const snap = new CurveEndPointSnap(undefined, new THREE.Vector3(2, 2, 0), curveSnap, model.GetTMin());

        pointPicker.activateSnapped([snap]);

        let snaps = pointPicker.snaps;
        expect(snaps.length).toBe(4);
        expect(snaps[0]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[1]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[2]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[3]).toBeInstanceOf(PointAxisSnap);
        expect(snaps[3].name).toEqual("Tangent");

        pointPicker.undo();
        snaps = pointPicker.snaps;
        expect(snaps.length).toBe(0);
    });
});

describe('for curves', () => {
    const constructionPlane = new PlaneSnap();
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
        snaps = pointPicker.snaps;
        expect(snaps.length).toBe(0);

        pointPicker.addPickedPoint({
            point: new THREE.Vector3(5, 1, 0),
            info: { snap: new CurveSnap(circle2, model2), constructionPlane }
        });
        snaps = pointPicker.snaps;
        expect(snaps.length).toBe(6);

        const orientation = new THREE.Quaternion();
        const snap = new CurveSnap(circle1, model1);
        pointPicker.activateMutualSnaps([snap]);

        snaps = pointPicker.snaps;
        expect(snaps.length).toBe(12);
        expect(snaps[8]).toBeInstanceOf(TanTanSnap);
        expect(snaps[9]).toBeInstanceOf(TanTanSnap);
        expect(snaps[10]).toBeInstanceOf(TanTanSnap);
        expect(snaps[11]).toBeInstanceOf(TanTanSnap);
    });
});

describe(Presentation, () => {
    test("it gives info for best snap and names other possible snaps", () => {
        const hitPosition = new THREE.Vector3(1, 1, 1);
        const orientation = new THREE.Quaternion();
        const startPoint = new PointSnap("startpoint", new THREE.Vector3(1, 1, 1));
        const endPoint = new PointSnap("endpoint", new THREE.Vector3(1, 1, 1));
        const snapResults = [
            { snap: endPoint, position: hitPosition, orientation },
            { snap: startPoint, position: hitPosition, orientation }
        ];
        const presentation = new Presentation([], snapResults, new PlaneSnap(), false, presenter);

        expect(presentation.names).toEqual(["endpoint", "startpoint"]);
        expect(presentation.info!.position).toBe(hitPosition);
        expect(presentation.info!.snap).toBe(endPoint);
    });
});