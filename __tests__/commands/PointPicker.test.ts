import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { Model, Presentation } from '../../src/commands/PointPicker';
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { AxisSnap, CurveEdgeSnap, FaceSnap, LineSnap, OrRestriction, PlaneSnap, PointSnap } from '../../src/editor/snaps/Snap';
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let pointPicker: Model;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let snaps: SnapManager;
let gizmos: GizmoMaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    gizmos = new GizmoMaterialDatabase(signals);
    snaps = new SnapManager(db, gizmos, signals);
    pointPicker = new Model(db, snaps);
});

describe('restrictToPlaneThroughPoint', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(constructionPlane).length).toBe(0);
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane);
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(PlaneSnap);
        const planeSnap = restrictions[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);

        const planeSnap = snaps[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane);
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
        expect(pointPicker.restrictionsFor(constructionPlane).length).toBe(0);
        pointPicker.addSnap(pointSnap);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane);
        expect(restrictions.length).toBe(0);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
    });

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane);
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
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        or = pointPicker.restrictToEdges([box.edges.get(0), box.edges.get(1)]);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(OrRestriction);
        expect(restrictions[0]).toBe(or);
        expect(or.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(or.isValid(new THREE.Vector3(0.5, 0, 0))).toBe(false);
        expect(or.isValid(new THREE.Vector3(1, 1, 0))).toBe(true);
    })

    test("restrictionSnapsFor", () => {
        let snaps;
        snaps = pointPicker.restrictionSnapsFor(new PlaneSnap());
        expect(snaps.length).toBe(2);
        expect(snaps[0]).toBeInstanceOf(CurveEdgeSnap);
        expect(snaps[1]).toBeInstanceOf(CurveEdgeSnap);
    })

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane);
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
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        pointPicker.restrictToPlane(planeSnap);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBe(planeSnap);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(new PlaneSnap());
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(planeSnap);
    })

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(planeSnap);
    })
});

describe('restrictToLine', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        pointPicker.restrictToLine(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(LineSnap);
    })

    test("restrictionSnapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(LineSnap);
    });

    test("snapsFor", () => {
        const constructionPlane = new PlaneSnap();
        const snaps = pointPicker.snapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(constructionPlane);
    })
});

const Y = new THREE.Vector3(0, 1, 0);

describe('addAxesAt', () => {
    const constructionPlane = new PlaneSnap();

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(constructionPlane).length).toBe(0);
        pointPicker.addAxesAt(new THREE.Vector3(0, 0, 0), new THREE.Quaternion().setFromUnitVectors(Y, new THREE.Vector3(1, 1, 1)));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(constructionPlane);
        expect(restrictions.length).toBe(0);
    })

    test("restrictionSnapsFor", () => {
        const snaps = pointPicker.restrictionSnapsFor(constructionPlane);
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBe(constructionPlane);
    })

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(constructionPlane);
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
    })
});

describe(Presentation, () => {
    test("it gives info for best snap and names other possible snaps", () => {
        const hitPosition = new THREE.Vector3(1, 1, 1);
        const indicator = new THREE.Object3D();
        const pointSnap = new PointSnap("endpoint", new THREE.Vector3(1, 1, 1));
        const snapResults = [
            { snap: pointSnap, position: hitPosition, indicator: indicator }
        ];
        const presentation = new Presentation([], snapResults, new PlaneSnap());

        expect(presentation.names).toEqual(["endpoint"]);
        expect(presentation.info!.position).toBe(hitPosition);
        expect(presentation.info!.snap).toBe(pointSnap);
        expect(presentation.helpers[0]).toBe(indicator);
    })
});