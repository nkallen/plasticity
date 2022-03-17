/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { PointPickerModel } from "../../src/command/point-picker/PointPickerModel";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { Viewport } from "../../src/components/viewport/Viewport";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { PlaneDatabase } from "../../src/editor/PlaneDatabase";
import { PointPickerSnapPickerStrategy } from "../../src/editor/snaps/PointPickerSnapPickerStrategy";
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import { SnapResult } from "../../src/editor/snaps/SnapPicker";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let db: GeometryDatabase;
let signals: EditorSignals;
let materials: MaterialDatabase;
let planes: PlaneDatabase;
let crosses: CrossPointDatabase;
let viewport: Viewport;
let snaps: SnapManager;

beforeEach(() => {
    const editor = new Editor();

    snaps = editor.snaps;
    materials = editor.materials;
    signals = editor.signals;
    db = editor._db;
    crosses = editor.crosses;
    planes = editor.planes;
    viewport = MakeViewport(editor);
})


let solid: visual.Solid;
beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

const snap = new PointPickerSnapPickerStrategy();

let pointPicker: PointPickerModel;

beforeEach(() => {
    pointPicker = new PointPickerModel(db, crosses, new CommandRegistry(), signals);
})

test('applyRestrictions when no restriction', () => {
    expect(pointPicker.restrictionFor(viewport.constructionPlane, viewport.isOrthoMode)).toBe(undefined);
    const result = { snap: snaps.identityMap.lookup(solid.faces.get(0)) } as SnapResult;
    const results = snap.applyRestrictions(pointPicker, viewport, [result]);
    expect(results).toEqual([result]);
});

test('applyRestrictions when face construction plane and restriction', () => {
    const face = solid.faces.get(0);
    viewport.constructionPlane = viewport.cplanes.constructionPlaneForFace(face);
    expect(pointPicker.restrictionFor(viewport.constructionPlane, viewport.isOrthoMode)).toBe(undefined);
    const result = { snap: snaps.identityMap.lookup(face) } as SnapResult;
    const results = snap.applyRestrictions(pointPicker, viewport, [result]);
    expect(results).toEqual([]);
});