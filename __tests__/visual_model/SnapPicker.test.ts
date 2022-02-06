/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import { Model } from '../../src/command/PointPicker';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from '../../src/commands/curve/CurveFactory';
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Orientation } from '../../src/components/viewport/ViewportNavigator';
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import LayerManager from "../../src/editor/LayerManager";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { ConstructionPlaneSnap } from '../../src/editor/snaps/ConstructionPlaneSnap';
import { CurveEndPointSnap, EdgePointSnap, FaceSnap, PointSnap } from "../../src/editor/snaps/Snap";
import { PointSnapCache, SnapManagerGeometryCache } from '../../src/editor/snaps/SnapManagerGeometryCache';
import { RaycasterParams, SnapPicker } from "../../src/editor/snaps/SnapPicker";
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let editor: Editor;
let layers: LayerManager;
let signals: EditorSignals;
let selection: SelectionDatabase;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let viewport: Viewport;
let snaps: SnapManagerGeometryCache;
let crosses: CrossPointDatabase
let registry: CommandRegistry;

beforeEach(() => {
    editor = new Editor();
    materials = editor.materials;
    db = editor._db;
    signals = editor.signals;
    selection = editor._selection;
    layers = editor.layers;
    viewport = MakeViewport(editor);
    snaps = new SnapManagerGeometryCache(editor.snaps, editor.db);
    crosses = editor.crosses;
    registry = editor.registry;
});

let pointPicker: Model;

beforeEach(() => {
    pointPicker = new Model(db, crosses, registry, signals);
})

let picker: SnapPicker;
let nearbyParams: THREE.RaycasterParameters = {};
let intersectParams: RaycasterParams = { Line2: { threshold: 10 }, Points: { threshold: 10 } };

describe('Unit tests', () => {
    const raycaster = new THREE.Raycaster();
    let raycast: jest.SpyInstance;

    beforeEach(() => {
        picker = new SnapPicker(intersectParams, nearbyParams, raycaster);
        raycast = jest.spyOn(raycaster, 'intersectObjects');
    });

    const event = new MouseEvent('move', { clientX: 50, clientY: 50 });

    beforeEach(() => {
        picker.setFromViewport(event, viewport);
    });

    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(0.5, 0, 0);
        makeBox.p3 = new THREE.Vector3(0.5, 0.5, 0);
        makeBox.p4 = new THREE.Vector3(0.5, 0.5, 0.5);
        box = await makeBox.commit() as visual.Solid;
        box.updateMatrixWorld();
        snaps.update();
    })

    test('intersect', () => {
        const intersection = { point: new THREE.Vector3(), distance: 1, object: box.faces.get(0) };
        raycast.mockReturnValueOnce([intersection]).mockReturnValueOnce([]);
        const result = picker.intersect(pointPicker, snaps, db);
        expect(result[0].snap).toBeInstanceOf(FaceSnap);
    });

    test('returns nearest', () => {
        const object = [...snaps.geometrySnaps.points][0];
        const closer = { point: new THREE.Vector3(), distance: 0.1, object, index: 1 };
        const farther = { point: new THREE.Vector3(), distance: 1, object: box.faces.get(0) };
        raycast.mockReturnValueOnce([farther]).mockReturnValueOnce([closer]);
        const results = picker.intersect(pointPicker, snaps, db);
        expect(results.length).toBe(1);
        expect(results[0].snap).toBeInstanceOf(EdgePointSnap);
    });

    test('preference overrides nearest', () => {
        const faceIntersection = { point: new THREE.Vector3(), distance: 1, object: box.faces.get(0) };
        raycast.mockReturnValueOnce([faceIntersection]).mockReturnValueOnce([]);
        const faceSnap = picker.intersect(pointPicker, snaps, db)[0].snap;
        if (!(faceSnap instanceof FaceSnap)) throw '';

        pointPicker.facePreferenceMode = 'weak';
        pointPicker.addPickedPoint({ point: new THREE.Vector3(), info: { snap: faceSnap, orientation: new THREE.Quaternion(), cameraOrientation: new THREE.Quaternion(), cameraPosition: new THREE.Vector3(), constructionPlane: new ConstructionPlaneSnap() } });

        const object = [...snaps.geometrySnaps.points][0];
        const closer = { point: new THREE.Vector3(), distance: 0.1, object, index: 12 };
        raycast.mockReturnValueOnce([faceIntersection]).mockReturnValueOnce([closer]);
        const results = picker.intersect(pointPicker, snaps, db);
        expect(results).toHaveLength(1);
        expect(results[0].snap).toBeInstanceOf(FaceSnap);
    });

    test('when isOrtho is true, face snaps are turned off', () => {
        viewport.navigate(Orientation.posZ);
        expect(viewport.isOrthoMode).toBe(true);
        picker.setFromViewport(event, viewport);
        raycaster.layers.enableAll();
        expect(raycaster.layers.isEnabled(visual.Layers.Face)).toBe(true);
        picker.intersect(pointPicker, snaps, db);
        expect(raycaster.layers.isEnabled(visual.Layers.Face)).toBe(false);
        picker.disposable.dispose();
        expect(raycaster.layers.isEnabled(visual.Layers.Face)).toBe(true);
    });
});

describe('Integration test', () => {
    beforeEach(() => {
        picker = new SnapPicker(intersectParams, nearbyParams);
    });

    const event = new MouseEvent('move', { clientX: 50, clientY: 50 });

    beforeEach(() => {
        picker.setFromViewport(event, viewport);
        intersectParams.Points = { threshold: 100000000000 };
        intersectParams.Line = { threshold: 100000000000 };
        intersectParams.Mesh = { threshold: 100000000000 };
        nearbyParams.Points = { threshold: 100000000000 };
        nearbyParams.Line = { threshold: 100000000000 };
        nearbyParams.Mesh = { threshold: 100000000000 };
    })

    describe('nearby', () => {
        test('when no geometry or point picker settings', () => {
            expect(picker.nearby(pointPicker, snaps, db).map(s => s.name)).toEqual(["Origin"]);
        });

        test('when point picker additions', () => {
            nearbyParams.Points = { threshold: 100000000000 };

            const snap = new PointSnap("foo", new THREE.Vector3());
            pointPicker.addSnap(snap);
            expect(picker.nearby(pointPicker, snaps, db).map(s => s.name)).toEqual(["foo", "Origin"]);
        })

        describe('when geometry additions', () => {
            describe('A solid', () => {
                beforeEach(async () => {
                    const makeBox = new ThreePointBoxFactory(db, materials, signals);
                    makeBox.p1 = new THREE.Vector3();
                    makeBox.p2 = new THREE.Vector3(1, 0, 0);
                    makeBox.p3 = new THREE.Vector3(1, 1, 0);
                    makeBox.p4 = new THREE.Vector3(1, 1, 1);
                    await makeBox.commit() as visual.Solid;
                    snaps.update();
                    nearbyParams.Points = { threshold: 100000000000 };
                })

                test('it returns snap points for the geometry', () => {
                    const actual = picker.nearby(pointPicker, snaps, db);
                    expect(actual.length).toBe(20);
                })
            });

            describe('A curve', () => {
                beforeEach(async () => {
                    const makeCurve = new CurveFactory(db, materials, signals);
                    makeCurve.push(new THREE.Vector3());
                    makeCurve.push(new THREE.Vector3(1, 1, 0));
                    makeCurve.push(new THREE.Vector3(2, -1, 0));
                    await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
                    snaps.update();
                    nearbyParams.Points = { threshold: 100000000000 };
                    layers.showControlPoints();
                })

                test('it returns snap points for the geometry', () => {
                    const actual = picker.nearby(pointPicker, snaps, db);
                    expect(actual.map(s=>s.name)).toEqual(["End", "Beginning", "Origin"]);
                })
            })
        });
    });

    describe('intersect', () => {
        test('when no geometry or point picker settings', () => {
            expect(picker.intersect(pointPicker, snaps, db)).toHaveLength(3);
        });

        describe('when geometry additions', () => {
            describe('A solid', () => {
                beforeEach(async () => {
                    const makeBox = new ThreePointBoxFactory(db, materials, signals);
                    makeBox.p1 = new THREE.Vector3();
                    makeBox.p2 = new THREE.Vector3(0.5, 0, 0);
                    makeBox.p3 = new THREE.Vector3(0.5, 0.5, 0);
                    makeBox.p4 = new THREE.Vector3(0.5, 0.5, 0.5);
                    const box = await makeBox.commit() as visual.Solid;
                    box.updateMatrixWorld();
                    snaps.update();
                })

                test('it returns snap points for the geometry', () => {
                    const actual = picker.intersect(pointPicker, snaps, db);
                    expect(viewport.isOrthoMode).toBe(false);
                    expect(actual.length).toBe(1);
                    expect(actual.map(s => s.snap.name)).toEqual(['Center']);
                })
            });

            describe('A curve', () => {
                beforeEach(async () => {
                    const makeCurve = new CurveFactory(db, materials, signals);
                    makeCurve.type = c3d.SpaceType.Polyline3D;
                    makeCurve.push(new THREE.Vector3());
                    makeCurve.push(new THREE.Vector3(1, 1, 0));
                    makeCurve.push(new THREE.Vector3(2, -1, 0));
                    const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
                    item.updateMatrixWorld();
                    snaps.update();
                    layers.showControlPoints();
                })

                test('it returns snap points for the geometry', () => {
                    const actual = picker.intersect(pointPicker, snaps, db);
                    expect(actual.length).toBe(1);
                    expect(actual.map(s => s.snap.name)).toEqual(['End']);
                })
            })

            describe('restrictions', () => {
                let box: visual.Solid;

                beforeEach(async () => {
                    const makeBox = new ThreePointBoxFactory(db, materials, signals);
                    makeBox.p1 = new THREE.Vector3();
                    makeBox.p2 = new THREE.Vector3(0.5, 0, 0);
                    makeBox.p3 = new THREE.Vector3(0.5, 0.5, 0);
                    makeBox.p4 = new THREE.Vector3(0.5, 0.5, 0.5);
                    box = await makeBox.commit() as visual.Solid;
                    box.updateMatrixWorld();
                    snaps.update();
                })

                test("when no restrictions", () => {
                    const actual = picker.intersect(pointPicker, snaps, db);
                    expect(actual.length).toBe(1);
                    const first = actual[0];
                    expect(first.cursorPosition).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
                    expect(first.position).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
                })

                test('with a restriction, curorPosition and position differ', () => {
                    pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3());
                    const actual = picker.intersect(pointPicker, snaps, db);
                    expect(actual.length).toBe(2);
                    const first = actual[0];
                    expect(first.cursorPosition).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
                    expect(first.position).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0));
                })
            });
        });
    });
})

describe(SnapManagerGeometryCache, () => {
    describe('A curve', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;
            makeCurve.push(new THREE.Vector3());
            makeCurve.push(new THREE.Vector3(1, 1, 0));
            makeCurve.push(new THREE.Vector3(2, -1, 0));
            await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
            snaps.update();
        })

        test('it returns snap points for the geometry', () => {
            expect([...snaps.geometrySnaps.points][0].userData.points[0]).toBeInstanceOf(CurveEndPointSnap);
        })
    })
});

describe(PointSnapCache, () => {
    test('it returns snap points for the geometry', () => {
        const cache = new PointSnapCache();
        cache.add(new Set([new PointSnap("foo", new THREE.Vector3(1, 1, 1))]));
        const pointss = [...cache.points];
        expect(pointss.length).toBe(1);
        const points = pointss[0];
        expect(Array.from(points.geometry.attributes.position.array)).toEqual([1, 1, 1]);
    })
});
