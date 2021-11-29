import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Boxcastable, Boxcaster } from "../../src/selection/Boxcaster";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import c3d from '../../build/Release/c3d.node';
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(visual.CurveEdge, () => {
    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        box.updateMatrixWorld();
    })

    let camera: THREE.OrthographicCamera;
    let boxcaster: Boxcaster;
    beforeEach(() => {
        camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.001);
        camera.position.set(0, -10, 0);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        boxcaster = new Boxcaster(camera);
    })

    test('containsGeometry full containment', async () => {
        const edge = box.edges.get(0);

        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(edge.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        const edge = box.edges.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(edge.containsGeometry(boxcaster)).toBe(false);
    });
});

describe('visual.SpaceInstance<visual.Curve3D>', () => {
    let curve: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.type = c3d.SpaceType.Polyline3D;

        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(1, 0, 0));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        curve.updateMatrixWorld();
    })

    let camera: THREE.OrthographicCamera;
    let boxcaster: Boxcaster;

    beforeEach(() => {
        camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.001);
        camera.up.set(0, 0, 1);
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        boxcaster = new Boxcaster(camera);
        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
    })

    test('intersectsBounds', () => {
        expect(curve.intersectsBounds(boxcaster)).toBe('intersected');
    })

    test('boxcast contains', () => {
        const selects: Boxcastable[] = [];
        expect(curve.boxcast('contained', boxcaster, selects));
        expect(selects).toHaveLength(1);
    })

    test('boxcast intersected', () => {
        const selects: Boxcastable[] = [];
        expect(curve.boxcast('intersected', boxcaster, selects));
        expect(selects).toHaveLength(1);
    })

    test('containsGeometry full containment', async () => {
        const segment = curve.underlying.segments.get(0);

        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(segment.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        const segment = curve.underlying.segments.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(segment.containsGeometry(boxcaster)).toBe(false);
    });
})