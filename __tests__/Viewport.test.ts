/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import Reg, { Viewport, EditorLike } from "../src/components/viewport/Viewport";
import { EditorSignals } from "../src/Editor";
import { GeometryDatabase } from "../src/GeometryDatabase";
import MaterialDatabase from "../src/MaterialDatabase";
import { SelectionManager } from "../src/selection/SelectionManager";
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

THREE.WebGLRenderer = FakeWebGLRenderer;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    editor = {
        db: db,
        viewports: [],
        helpers: new Helpers(signals),
        signals: signals,
        selection: new SelectionManager(db, materials, signals),
    };
    const makeSphere = new SphereFactory(db, materials, signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    sphere = makeSphere.commit() as visual.Solid;
    viewport = new (Reg(editor))();
});

afterEach(() => {
})

// test("item selected", () => {
// });

test("item hovered", () => {
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
    signals.objectHovered.dispatch(sphere);
    expect(viewport.outlinePassHover.selectedObjects[0]).toBe(sphere.faces[0]);
    signals.objectUnhovered.dispatch(sphere);
    expect(viewport.outlinePassHover.selectedObjects).toEqual([]);
});

// test("navigation start & end", () => {
//     expect(1).toBe(1);
// })