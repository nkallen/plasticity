/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from '../../src/commands/curve/CurveFactory';
import { Model } from "../../src/commands/PointPicker";
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { Viewport } from "../../src/components/viewport/Viewport";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import LayerManager from "../../src/editor/LayerManager";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { CurveEndPointSnap, FaceSnap, PointSnap } from "../../src/editor/snaps/Snap";
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import { SnapManagerGeometryCache, SnapPicker } from "../../src/visual_model/SnapPicker";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import c3d from '../../build/Release/c3d.node';
import '../matchers';
import { Orientation } from '../../src/components/viewport/ViewportHelper';

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
    snaps = new SnapManagerGeometryCache(editor.snaps);
    crosses = editor.crosses;
    registry = editor.registry;
});

let picker: SnapPicker;
let nearbyParams: THREE.RaycasterParameters = {};
let intersectParams: THREE.RaycasterParameters = {};

beforeEach(() => {
    picker = new SnapPicker(layers, intersectParams, nearbyParams);

});

let pointPicker: Model;

beforeEach(() => {
    pointPicker = new Model(db, crosses, registry, signals);
})

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
        expect(picker.nearby(pointPicker, snaps, db)).toEqual([]);
    });

    test('when point picker additions', () => {
        nearbyParams.Points = { threshold: 100000000000 };

        const snap = new PointSnap(undefined, new THREE.Vector3());
        pointPicker.addSnap(snap);
        expect(picker.nearby(pointPicker, snaps, db)).toEqual([snap]);
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
                expect(actual.length).toBe(2);
            })
        })
    });
});

describe('intersect', () => {
    test('when no geometry or point picker settings', () => {
        expect(picker.intersect(pointPicker, snaps, db)).toHaveLength(4);
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
                expect(viewport.isOrtho).toBe(false);
                expect(actual.length).toBe(39);
            })

            test('when isOrtho is true, face snaps are turned off', () => {
                viewport.navigate(Orientation.posZ);
                expect(viewport.isOrtho).toBe(true);
                picker.setFromViewport(event, viewport);
                const actual = picker.intersect(pointPicker, snaps, db);
                expect(actual.filter(a => a.snap instanceof FaceSnap)).toHaveLength(0);
                expect(actual.length).toBe(39);
            });
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
                expect(actual.length).toBe(10);
            })
        })

        describe('restrictions', () => {
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

            test("when no restrictions", () => {
                const actual = picker.intersect(pointPicker, snaps, db);
                expect(actual.length).toBe(39);
                const first = actual[0];
                expect(first.cursorPosition).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
                expect(first.position).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
            })

            test('with a restriction, curorPosition and position differ', () => {
                pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3());
                const actual = picker.intersect(pointPicker, snaps, db);
                expect(actual.length).toBe(39);
                const first = actual[0];
                expect(first.cursorPosition).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0.5));
                expect(first.position).toApproximatelyEqual(new THREE.Vector3(0.25, 0.25, 0));
            })
        });
    });
});

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
            expect(snaps.get(snaps.points[0], 0)).toBeInstanceOf(CurveEndPointSnap);
        })
    })
});