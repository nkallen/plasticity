import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { Model, Presentation } from '../../src/commands/PointPicker';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { AxisCrossPointSnap, AxisSnap, CrossPointSnap, CurveEdgeSnap, CurvePointSnap, CurveSnap, LineSnap, OrRestriction, PlaneSnap, PointSnap } from '../../src/editor/snaps/Snap';
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import { SnapPresenter } from "../../src/editor/snaps/SnapPresenter";
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import c3d from '../build/Release/c3d.node';
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";

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
    pointPicker = new Model(db, snaps, crosses);
});

describe('restrictToPlaneThroughPoint', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(constructionPlane, false).length).toBe(0);
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane, false);
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(PlaneSnap);
        const planeSnap = restrictions[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);

        const planeSnap = snaps[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);

        const planeSnap = snaps[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});

describe('addSnap', () => {
    const pointSnap = new PointSnap(undefined, new THREE.Vector3(1, 1, 1));
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(constructionPlane, false).length).toBe(0);
        pointPicker.addSnap(pointSnap);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane, false);
        expect(restrictions.length).toBe(0);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
    });

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(2);
        expect(snaps[0]).toBe(pointSnap);
        expect(snaps[1]).toBe(constructionPlane);
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
        expect(pointPicker.restrictionsFor(new PlaneSnap(), false).length).toBe(0);
        or = pointPicker.restrictToEdges([box.edges.get(0), box.edges.get(1)]);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap(), false);
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(OrRestriction);
        expect(restrictions[0]).toBe(or);
        expect(or.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(or.isValid(new THREE.Vector3(0.5, 0, 0))).toBe(false);
        expect(or.isValid(new THREE.Vector3(1, 1, 0))).toBe(true);
    })

    test("restrictionSnapsFor", () => {
        let snaps;
        snaps = pointPicker.restrictionSnapsFor(new PlaneSnap(), false);
        expect(snaps.length).toBe(2);
        expect(snaps[0]).toBeInstanceOf(CurveEdgeSnap);
        expect(snaps[1]).toBeInstanceOf(CurveEdgeSnap);
    })

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(constructionPlane);
    })
});

describe('restrictToPlane', () => {
    let planeSnap: PlaneSnap;

    beforeEach(async () => {
        planeSnap = new PlaneSnap(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
    });

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap(), false).length).toBe(0);
        pointPicker.restrictToPlane(planeSnap);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap(), false);
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBe(planeSnap);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(new PlaneSnap(), false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(planeSnap);
    })

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(planeSnap);
    })
});

describe('restrictToLine', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap(), false).length).toBe(0);
        pointPicker.restrictToLine(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap(), false);
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(LineSnap);
    })

    test("restrictionSnapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(LineSnap);
    });

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(constructionPlane);
    })
});

const Y = new THREE.Vector3(0, 1, 0);

describe('addAxesAt', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(constructionPlane, false).length).toBe(0);
        pointPicker.addAxesAt(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(1, 1, 1)));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane, false);
        expect(restrictions.length).toBe(0);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane, false);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(constructionPlane);
    })

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane, false);
        expect(snaps.length).toBe(4);
        expect(snaps[0]).toBeInstanceOf(AxisSnap);
        expect(snaps[1]).toBeInstanceOf(AxisSnap);
        expect(snaps[2]).toBeInstanceOf(AxisSnap);
        expect(snaps[3]).toBe(constructionPlane);

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
    });


    describe('activateSnapped', () => {
        let circle1: visual.SpaceInstance<visual.Curve3D>;
        let model1: c3d.Curve3D;

        beforeEach(async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3();
            makeCircle.radius = 1;
            circle1 = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(circle1);
            const item = inst.GetSpaceItem()!;
            model1 = item.Cast<c3d.Curve3D>(item.IsA());
        });

        test("for points on curves, activateSnapped adds axes, and deduplicates", () => {
            let snaps;
            snaps = pointPicker.snapsFor(constructionPlane, false);
            expect(snaps.length).toBe(4);

            const position = new THREE.Vector3(1, 1, 1);
            const orientation = new THREE.Quaternion();
            const snap = new CurvePointSnap("startpoint", position, new CurveSnap(circle1, model1), 0);
            const snapResults = [{ snap, position, orientation }];
            pointPicker.activateSnapped(snapResults);

            snaps = pointPicker.snapsFor(constructionPlane, false)
            expect(snaps.length).toBe(8);
            expect(snaps[0]).toBeInstanceOf(AxisSnap);
            expect(snaps[1]).toBeInstanceOf(AxisSnap);
            expect(snaps[2]).toBeInstanceOf(AxisSnap);
            expect(snaps[3]).toBeInstanceOf(AxisSnap);
            expect(snaps[4]).toBeInstanceOf(AxisSnap);
            expect(snaps[5]).toBeInstanceOf(AxisCrossPointSnap);
            expect(snaps[6]).toBeInstanceOf(AxisSnap);
            expect(snaps[7]).toBe(constructionPlane);

            pointPicker.activateSnapped(snapResults);
            snaps = pointPicker.snapsFor(constructionPlane, false)
            expect(snaps.length).toBe(8);
        });

        describe('for curves', () => {
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

            test("activateNearby adds tan/tan", () => {
                let snaps;
                snaps = pointPicker.snapsFor(constructionPlane, false);
                expect(snaps.length).toBe(4);

                pointPicker.addPickedPoint({
                    point: new THREE.Vector3(5, 1, 0),
                    info: { snap: new CurveSnap(circle2, model2), constructionPlane }
                });
                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(7);

                const orientation = new THREE.Quaternion();
                const snap = new CurveSnap(circle1, model1);
                const snapResults = [{ snap, position: new THREE.Vector3(1, 0, 0), orientation }];
                pointPicker.activateSnapped(snapResults);

                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(13);
            });

            test("activateNearby adds tangents, and deduplicates, respects undo", () => {
                let snaps;
                snaps = pointPicker.snapsFor(constructionPlane, false);
                expect(snaps.length).toBe(4);

                const position = new THREE.Vector3(1, 0, 0);
                const orientation = new THREE.Quaternion();
                const snap = new CurveSnap(circle1, model1);
                const snapResults = [{ snap, position, orientation }];
                pointPicker.activateSnapped(snapResults);

                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(4);

                pointPicker.addPickedPoint({ point: new THREE.Vector3(10, 1, 0), info: { snap: new PointSnap(undefined), constructionPlane } });
                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(7);

                pointPicker.activateSnapped(snapResults);
                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(9);

                pointPicker.activateSnapped(snapResults);
                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(9);

                pointPicker.undo();
                pointPicker.activateSnapped(snapResults);
                snaps = pointPicker.snapsFor(constructionPlane, false)
                expect(snaps.length).toBe(6);
            });
        });
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
    })
});