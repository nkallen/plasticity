/**
 * @jest-environment jsdom
 */
import { Disposable } from "event-kit";
import * as THREE from "three";
import Command from "../src/commands/Command";
import { CancelOrFinish } from "../src/commands/CommandExecutor";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorLike, Viewport } from "../src/components/viewport/Viewport";
import { Orientation } from "../src/components/viewport/ViewportHelper";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import { EditorOriginator } from "../src/editor/History";
import MaterialDatabase from "../src/editor/MaterialDatabase";
import { PlaneSnap } from "../src/editor/snaps/Snap";
import * as visual from '../src/editor/VisualModel';
import { HighlightManager } from "../src/selection/HighlightManager";
import { SelectionInteractionManager } from "../src/selection/SelectionInteraction";
import { SelectionManager } from "../src/selection/SelectionManager";
import { Helpers } from "../src/util/Helpers";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import { MakeViewport } from "../__mocks__/FakeViewport";
import './matchers';
jest.mock('three/examples/jsm/loaders/EXRLoader.js');

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let viewport: Viewport;
let editor: EditorLike;
let sphere: visual.Solid;
let selection: SelectionManager;
let interaction: SelectionInteractionManager;
let originator: EditorOriginator;
let highlighter: HighlightManager;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    interaction = new SelectionInteractionManager(selection, materials, signals);
    highlighter = new HighlightManager(db, materials, selection, signals);
    editor = {
        db: db,
        viewports: [],
        helpers: new Helpers(signals),
        signals: signals,
        selection: selection,
        originator: originator,
        materials: materials,
        selectionInteraction: interaction,
        registry: { add: () => new Disposable() },
        enqueue: (command: Command, cancelOrFinish?: CancelOrFinish) => Promise.resolve(),
        highlighter: highlighter
    } as unknown as EditorLike;
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

test("item selected", () => {
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onClick([{ object: sphere.faces.get(0), distance: 1, point }]);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toEqual(sphere.outline);
    interaction.onClick([]);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
});

test("item hovered", () => {
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onHover([{ object: sphere.faces.get(0), distance: 1, point }]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual(sphere.outline);
    interaction.onHover([]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
});

test("navigation start & end", () => {
    expect(viewport.selector.enabled).toBe(true);
    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.selector.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.selector.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'end', target: null });
    expect(viewport.selector.enabled).toBe(true);
});

test("navigation start & end restores selector state correctly", () => {
    viewport.selector.enabled = false;
    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.selector.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.selector.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'end', target: null });
    expect(viewport.selector.enabled).toBe(false);
});

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

test("changing construction plane changes grid orientation", () => {
    const quat = new THREE.Quaternion();

    expect(viewport.constructionPlane.n).toApproximatelyEqual(X);
    quat.setFromUnitVectors(Y, X);
    expect(viewport.grid.quaternion.angleTo(quat)).toBeCloseTo(0)

    viewport.constructionPlane = new PlaneSnap(Y);

    quat.setFromUnitVectors(Y, Y);
    expect(viewport.grid.quaternion.angleTo(quat)).toBeCloseTo(0)
});

test("navigate(to)", () => {
    expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
    viewport.navigate(Orientation.posX);
    expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
    expect(viewport.camera.quaternion.dot(new THREE.Quaternion().setFromUnitVectors(Z, X))).toBeCloseTo(1);
});