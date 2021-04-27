/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { EventDispatcher } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import Reg, { Viewport, EditorLike, Model } from "../src/components/viewport/Viewport";
import { EditorSignals } from "../src/Editor";
import { GeometryDatabase } from "../src/GeometryDatabase";
import MaterialDatabase from "../src/MaterialDatabase";
import { SelectionManager } from "../src/selection/SelectionManager";
import { PlaneSnap } from "../src/SnapManager";
import { Helpers } from "../src/util/Helpers";
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let viewport: Viewport;
let editor: EditorLike;
let sphere: visual.Solid;
let selection: SelectionManager;
let navigationControls: EventDispatcher;

class FakeWebGLRenderer implements THREE.Renderer {
    domElement = document.createElement("canvas");

    render(scene: THREE.Object3D, camera: THREE.Camera): void { }
    setSize(width: number, height: number, updateStyle?: boolean): void { }

    getPixelRatio(): number {
        throw new Error("Method not implemented.");
    };

    setPixelRatio(value: number): void { };

    getSize(target: THREE.Vector2): THREE.Vector2 {
        return new THREE.Vector2();
    };

    getRenderTarget() { return null }
    setRenderTarget() { }
    clear() { }
    clearDepth() { }
}

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    editor = {
        db: db,
        viewports: [],
        helpers: new Helpers(signals),
        signals: signals,
        selection: selection,
    };
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    sphere = await makeSphere.commit() as visual.Solid;
    navigationControls = new EventDispatcher()
    viewport = new Model(
        editor,
        new FakeWebGLRenderer() as unknown as THREE.WebGLRenderer,
        document.createElement('viewport'),
        new THREE.Camera(),
        new PlaneSnap(new THREE.Vector3(1, 0, 0), new THREE.Vector3()),
        null,
        navigationControls as unknown as OrbitControls
    )
    viewport.start();
});

test("item selected", () => {
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
    selection.onClick([{object: sphere.faces.get(0), distance: 1, point: new THREE.Vector3()}]);
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([sphere.faces]);
    selection.onClick([]);
    expect(viewport.outlinePassSelection.selectedObjects).toEqual([]);
});

test("item hovered", () => {
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
    selection.onPointerMove([{object: sphere.faces.get(0), distance: 1, point: new THREE.Vector3()}]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([sphere.faces]);
    selection.onPointerMove([]);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
});

test("navigation start & end", () => {
    expect(viewport.selector.enabled).toBeTruthy();
    navigationControls.dispatchEvent({ type: 'start' });
    expect(viewport.selector.enabled).toBeTruthy();
    navigationControls.dispatchEvent({ type: 'change' });
    expect(viewport.selector.enabled).toBeFalsy();
    navigationControls.dispatchEvent({ type: 'end' });
    expect(viewport.selector.enabled).toBeTruthy();
});