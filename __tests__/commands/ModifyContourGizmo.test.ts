/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { EditorLike, Mode, MovementInfo } from "../../src/commands/AbstractGizmo";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { ChamferAndFilletKeyboardGizmo, FilletKeyboardGizmo } from "../../src/commands/fillet/FilletKeyboardGizmo";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { ModifyContourFactory } from "../../src/commands/modify_contour/ModifyContourFactory";
import { ModifyContourGizmo } from "../../src/commands/modify_contour/ModifyContourGizmo";
import { Viewport } from "../../src/components/viewport/Viewport";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import * as visual from '../../src/visual_model/VisualModel';
import { Cancel, CancellablePromise } from "../../src/util/Cancellable";
import { inst2curve, normalizeCurve } from "../../src/util/Conversion";
import { Helpers } from "../../src/util/Helpers";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let modify: ModifyContourFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let editor: EditorLike;
let gizmos: GizmoMaterialDatabase;
let helpers: Helpers;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    modify = new ModifyContourFactory(db, materials, signals);
    gizmos = new GizmoMaterialDatabase(signals);
    helpers = new Helpers(signals);
    const viewports: Viewport[] = [];
    editor = { db, gizmos, helpers, signals, viewports } as unknown as EditorLike;
})

describe(ModifyContourGizmo, () => {
    let gizmo: ModifyContourGizmo;
    let promise: CancellablePromise<void>;

    describe('when there are corners', () => {
        let line: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeLine = new CurveFactory(db, materials, signals);
            makeLine.type = c3d.SpaceType.Polyline3D;
            makeLine.points.push(new THREE.Vector3());
            makeLine.points.push(new THREE.Vector3(3, 3, 0));
            makeLine.points.push(new THREE.Vector3(-3, 0, 0));
            line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(line);

            const contour = await normalizeCurve(inst2curve(inst)!);
            modify.contour = contour;
        });

        beforeEach(() => {
            gizmo = new ModifyContourGizmo(modify, editor);
            promise = gizmo.execute(async params => { });
        })

        test("there is a filletAll gizmo", async () => {
            const filletAll = gizmo['filletAll'];

            expect(filletAll.stateMachine).not.toBe(undefined);

            promise.finish();
            await promise;
        });
    });

    describe('when there are no corners', () => {
        let line: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeLine = new CurveFactory(db, materials, signals);
            makeLine.type = c3d.SpaceType.Hermit3D;
            makeLine.points.push(new THREE.Vector3());
            makeLine.points.push(new THREE.Vector3(3, 3, 0));
            makeLine.points.push(new THREE.Vector3(-3, 0, 0));
            line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            const inst = db.lookup(line);

            const contour = await normalizeCurve(inst2curve(inst)!);
            modify.contour = contour;
        });

        beforeEach(() => {
            gizmo = new ModifyContourGizmo(modify, editor);
            promise = gizmo.execute(async params => { });
        })

        test("there is a filletAll gizmo", async () => {
            const filletAll = gizmo['filletAll'];

            expect(filletAll.stateMachine).toBe(undefined);

            promise.finish();
            await promise;
        });
    });
});