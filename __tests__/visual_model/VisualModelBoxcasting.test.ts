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
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { FastFrustum } from "../../src/visual_model/VisualModelBoxcasting";
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
})

describe(visual.FaceGroup, () => {
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
        const faces = box.faces;

        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(faces.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        const faces = box.faces;

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(faces.containsGeometry(boxcaster)).toBe(false);
    });

    test('intersectsGeometry only intersection', async () => {
        const faces = box.faces;

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(faces.intersectsGeometry(boxcaster)).toBe(true);
    });
});

describe(visual.Face, () => {
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
        const faec = box.faces.get(0);

        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(faec.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        const face = box.faces.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(face.containsGeometry(boxcaster)).toBe(false);
    });

    test('intersectsGeometry only intersection', async () => {
        const face = box.faces.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(face.intersectsGeometry(boxcaster)).toBe(true);
    });
});

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

    test('intersectsGeometry only intersection', async () => {
        const edge = box.edges.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(edge.intersectsGeometry(boxcaster)).toBe(true);
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
        boxcaster.layers.enable(visual.Layers.Curve);
        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
    })

    test('intersectsBounds', () => {
        expect(curve.intersectsBounds(boxcaster)).toBe('contained');
    })

    test('boxcast contains', () => {
        const selects: Boxcastable[] = [];
        expect(curve.boxcast('contained', boxcaster, selects));
        expect(selects).toEqual([curve.underlying]);
    })

    test('boxcast intersected', () => {
        const selects: Boxcastable[] = [];
        expect(curve.boxcast('intersected', boxcaster, selects));
        expect(selects).toEqual([curve.underlying]);
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

    test('intersectsGeometry only intersection', async () => {
        const segment = curve.underlying.segments.get(0);

        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(segment.intersectsGeometry(boxcaster)).toBe(true);
    });
})

describe('visual.PlaneInstance<visual.Region>', () => {
    let region: visual.PlaneInstance<visual.Region>;

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        const curve = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeRegion = new RegionFactory(db, materials, signals);
        makeRegion.contours = [curve];
        const regions = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
        region = regions[0];
        region.updateMatrixWorld();
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
        expect(region.intersectsBounds(boxcaster)).toBe('contained');
    })

    test('boxcast contains', () => {
        const selects: Boxcastable[] = [];
        expect(region.boxcast('contained', boxcaster, selects));
        expect(selects).toHaveLength(1);
    })

    test('boxcast intersected', () => {
        const selects: Boxcastable[] = [];
        expect(region.boxcast('intersected', boxcaster, selects));
        expect(selects).toHaveLength(1);
    })

    test('containsGeometry full containment', async () => {
        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(region.underlying.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(region.underlying.containsGeometry(boxcaster)).toBe(false);
    });

    test('intersectsGeometry only intersection', async () => {
        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(region.underlying.intersectsGeometry(boxcaster)).toBe(true);
    });
})

describe(visual.ControlPoint, () => {
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
        boxcaster.layers.set(visual.Layers.ControlPoint);
        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
    })

    test('intersectsBounds', () => {
        expect(curve.underlying.points.intersectsBounds(boxcaster)).toBe('contained');
    })

    test('boxcast contains', () => {
        const selects: visual.ControlPoint[] = [];
        expect(curve.boxcast('contained', boxcaster, selects));
        expect(selects.map(s => s.simpleName)).toEqual([...curve.underlying.points].map(s => s.simpleName));
    })

    test('boxcast intersected', () => {
        const selects: visual.ControlPoint[] = [];
        expect(curve.underlying.points.boxcast('intersected', boxcaster, selects));
        expect(selects.map(s => s.simpleName)).toEqual([...curve.underlying.points].map(s => s.simpleName));
    })
})

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

describe(FastFrustum, () => {
    const frustum = new FastFrustum(
        new THREE.Plane(X, 1),
        new THREE.Plane(Y, 1),
        new THREE.Plane(Z, 1),
        new THREE.Plane(_X, 1),
        new THREE.Plane(_Y, 1),
        new THREE.Plane(_Z, 1),
    );

    test('containsPoint', () => {
        expect(frustum.containsPoint(new THREE.Vector3())).toBe(true);
        expect(frustum.containsPoint(new THREE.Vector3(1, 1, 1))).toBe(true);
        expect(frustum.containsPoint(new THREE.Vector3(10, 10, 10))).toBe(false);
    })

    test('intersectsLine', () => {
        expect(frustum.intersectsLine(new THREE.Line3(_X, X))).toBe(true);
        expect(frustum.intersectsLine(new THREE.Line3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10)))).toBe(true);
        expect(frustum.intersectsLine(new THREE.Line3(new THREE.Vector3(-10, -10, 0), new THREE.Vector3(-10, 10, 0)))).toBe(false);
    })
})