/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Orientation } from "../../src/components/viewport/ViewportNavigator";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { PlaneDatabase } from "../../src/editor/PlaneDatabase";
import { ConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { ChangeSelectionExecutor, ChangeSelectionModifier, ChangeSelectionOption } from "../../src/selection/ChangeSelectionExecutor";
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';
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
    selection = editor.selection;
    interaction = editor.changeSelection;
});

beforeEach(async () => {
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    sphere = await makeSphere.commit() as visual.Solid;
    viewport = MakeViewport(editor);
    viewport.constructionPlane = new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0), new THREE.Vector3());
    viewport.start();
});

afterEach(async () => {
    viewport.dispose();
});

test("item selected outlines", () => {
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onClick([{ object: sphere.faces.get(0), point }], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toHaveLength(1);
    expect(viewport.outlinePassSelection.selectedObjects[0]).toEqual(sphere.outline!);
    interaction.onClick([], ChangeSelectionModifier.Replace, ChangeSelectionOption.None);
    signals.selectionChanged.dispatch({ selection: selection.selected, point });
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
});

test("item hovered outlines", () => {
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
    const point = new THREE.Vector3();
    interaction.onHover([{ object: sphere.faces.get(0), point }], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
    expect(viewport.outlinePassHover.selectedObjects).toHaveLength(1);
    expect(viewport.outlinePassHover.selectedObjects[0]).toEqual(sphere.outline!);
    interaction.onHover([], ChangeSelectionModifier.Add, ChangeSelectionOption.None);
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
    viewport.multiplexer.enable(false);
    viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
    viewport.navigationControls.dispatchEvent({ type: 'end', target: null });
    expect(viewport.multiplexer.enabled).toBe(false);
});

test("denormalizeScreenPosition", () => {
    expect(viewport.denormalizeScreenPosition(new THREE.Vector2(-1, -1))).toEqual(new THREE.Vector2(0, 100));
    expect(viewport.denormalizeScreenPosition(new THREE.Vector2(0, 0))).toEqual(new THREE.Vector2(50, 50));
    expect(viewport.denormalizeScreenPosition(new THREE.Vector2(1, 1))).toEqual(new THREE.Vector2(100, 0));
})

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

let solid: visual.Solid;
beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

let region: visual.PlaneInstance<visual.Region>;
beforeEach(async () => {
    const makeCircle = new CenterCircleFactory(db, materials, signals);
    const makeRegion = new RegionFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
    makeRegion.contours = [circle];
    const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    region = items[0];
});

describe('navigate', () => {
    test("navigate(face)", () => {
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
        viewport.navigate(solid.faces.get(0));
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, -1.22));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(Math.SQRT1_2, Math.SQRT1_2, 0, 0))).toBeCloseTo(1);
    });

    test("navigate(region)", () => {
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
        viewport.navigate(region);
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2))).toBeCloseTo(1);
    });

    test("navigate(orientation)", () => {
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
        viewport.navigate(Orientation.posX);
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);
    });

    test("navigate(undefined) custom cplane", () => {
        viewport.constructionPlane = new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0));
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
        viewport.navigate();
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);
    });

    test("navigate(undefined) default cplane", () => {
        viewport.constructionPlane = PlaneDatabase.XY;
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion())).toBeCloseTo(1);
        viewport.navigate();
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.position).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2))).toBeCloseTo(1);
    });

    test("isOrtho", () => {
        expect(viewport.isOrthoMode).toBe(false);
        viewport.navigate(Orientation.posX);
        expect(viewport.isOrthoMode).toBe(true);
    });

    test("navigation start & end turns off isOrtho", () => {
        expect(viewport.isOrthoMode).toBe(false);
        viewport.navigate(Orientation.posX);
        expect(viewport.isOrthoMode).toBe(true);
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);

        viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
        expect(viewport.isOrthoMode).toBe(true);

        viewport.camera.quaternion.copy(new THREE.Quaternion());
        viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
        expect(viewport.isOrthoMode).toBe(false);
    });

    test("navigation start & end restores perspective/orthographic camera state", () => {
        viewport.togglePerspective();
        expect(viewport.camera.isPerspectiveCamera).toBe(true);

        expect(viewport.isOrthoMode).toBe(false);
        viewport.navigate(Orientation.posX);
        expect(viewport.isOrthoMode).toBe(true);
        expect(viewport.camera.isOrthographicCamera).toBe(true);
        // @ts-ignore
        viewport.navigator.update(1000000000);
        expect(viewport.camera.quaternion.dot(new THREE.Quaternion(0.5, 0.5, 0.5, 0.5))).toBeCloseTo(1);

        viewport.navigationControls.dispatchEvent({ type: 'start', target: null });
        expect(viewport.isOrthoMode).toBe(true);

        viewport.camera.quaternion.copy(new THREE.Quaternion());
        viewport.navigationControls.dispatchEvent({ type: 'change', target: null });
        expect(viewport.isOrthoMode).toBe(false);
        expect(viewport.camera.isPerspectiveCamera).toBe(true);
    });
})

test("togglePerspective", () => {
    viewport.togglePerspective();
});

test("toggleXRay", () => {
    const xray = new THREE.Layers();
    xray.set(visual.Layers.CurveEdge_XRay);
    expect(editor.layers.visible.test(xray)).toBe(true);
    expect(editor.layers.intersectable.test(xray)).toBe(true);
    viewport.toggleXRay();
    expect(editor.layers.visible.test(xray)).toBe(false);
    expect(editor.layers.intersectable.test(xray)).toBe(false);
});

test("toggleOverlays", () => {
    viewport.toggleOverlays();
});

test("constructionPlane=Face", () => {
    viewport.constructionPlane = solid.faces.get(0);
    expect(viewport.constructionPlane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, -1));
})

test("constructionPlane=Region", () => {
    viewport.constructionPlane = region;
    expect(viewport.constructionPlane.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
})

test("constructionPlane=ConstructionPlane", () => {
    const cplane = new ConstructionPlaneSnap(new THREE.Vector3(1, 2, 3));
    viewport.constructionPlane = cplane;
    expect(viewport.constructionPlane).toBe(cplane);
})