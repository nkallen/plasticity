/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { GizmoMaterialDatabase } from "../../src/command/GizmoMaterials";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { ModifyContourFactory } from "../../src/commands/modify_contour/ModifyContourFactory";
import { ModifyContourGizmo } from "../../src/commands/modify_contour/ModifyContourGizmo";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { CancellablePromise } from "../../src/util/CancellablePromise";
import { inst2curve, normalizeCurve } from "../../src/util/Conversion";
import { Helpers } from "../../src/util/Helpers";
import * as visual from '../../src/visual_model/VisualModel';
import '../matchers';

let db: GeometryDatabase;
let modify: ModifyContourFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let editor: Editor;
let gizmos: GizmoMaterialDatabase;
let helpers: Helpers;

beforeEach(() => {
    editor = new Editor();
    materials = editor.materials;
    signals = editor.signals;
    db = editor._db;
    gizmos = editor.gizmos;
    helpers = editor.helpers;
})

beforeEach(() => {
    modify = new ModifyContourFactory(db, materials, signals);
});

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