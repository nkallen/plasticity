/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { Viewport } from "../src/components/viewport/Viewport";
import { Orientation } from "../src/components/viewport/ViewportHelper";
import { Editor } from "../src/editor/Editor";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import { IntersectableLayers, VisibleLayers } from "../src/editor/LayerManager";
import MaterialDatabase from "../src/editor/MaterialDatabase";
import { PlaneSnap } from "../src/editor/snaps/Snap";
import { ChangeSelectionExecutor } from "../src/selection/ChangeSelectionExecutor";
import { SelectionDatabase } from "../src/selection/SelectionDatabase";
import * as visual from '../src/visual_model/VisualModel';
import { MakeViewport } from "../__mocks__/FakeViewport";
import './matchers';
jest.mock('three/examples/jsm/loaders/EXRLoader.js');

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let viewport: Viewport;
let editor: Editor;
let sphere: visual.Solid;
let selection: SelectionDatabase;
let interaction: ChangeSelectionExecutor;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
    db = editor._db;
    materials = editor.materials;
    signals = editor.signals;
    selection = editor._selection;
    interaction = editor.changeSelection;
});

beforeEach(async () => {
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    sphere = await makeSphere.commit() as visual.Solid;
    viewport = MakeViewport(editor);
    viewport.constructionPlane = new PlaneSnap(new THREE.Vector3(1, 0, 0), new THREE.Vector3());
    viewport.start();
});

afterEach(async () => {
    viewport.dispose();
});

test("item selected outlines", () => {
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onClick([{ object: sphere.faces.get(0), point }]);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([sphere.outline]);
    interaction.onClick([]);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
});

test("item hovered outlines", () => {
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onHover([{ object: sphere.faces.get(0), point }]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([sphere.outline]);
    interaction.onHover([]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
});

test("navigation start & end", () => {
    expect(viewport.multiplexer.enabled).toBe(true);
    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'end', target: null });
    expect(viewport.multiplexer.enabled).toBe(true);
});

test("navigation start & end restores selector state correctly", () => {
    viewport.multiplexer.enabled = false;
    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'end', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
});

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

test("navigate(to)", () => {
    expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
    viewport.navigate(Orientation.posX);
    expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
    expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);
});

test("isOrtho", () => {
    expect(viewport.isOrtho).toBe(false);
    viewport.navigate(Orientation.posX);
    expect(viewport.isOrtho).toBe(true);
});

test("navigation start & end turns off isOrtho", () => {
    expect(viewport.isOrtho).toBe(false);
    viewport.navigate(Orientation.posX);
    expect(viewport.isOrtho).toBe(true);
    expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);

    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.isOrtho).toBe(true);

    viewport.camera.quaternion.copy(new THREE.Quaternion());
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.isOrtho).toBe(false);
});

test("togglePerspective", () => {
    viewport.togglePerspective();
});

test("toggleXRay", () => {
    const xray = new THREE.Layers();
    xray.set(visual.Layers.XRay);
    expect(VisibleLayers.test(xray)).toBe(true);
    expect(IntersectableLayers.test(xray)).toBe(true);
    viewport.toggleXRay();
    expect(VisibleLayers.test(xray)).toBe(false);
    expect(IntersectableLayers.test(xray)).toBe(false);
});

test("toggleOverlays", () => {
    viewport.toggleOverlays();
});