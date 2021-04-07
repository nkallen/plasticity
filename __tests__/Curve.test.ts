import * as THREE from "three";
import CurveFactory from '../src/commands/Curve';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import * as visual from '../src/VisualModel';
import './matchers';

let db: GeometryDatabase;
let makeCurve: CurveFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCurve = new CurveFactory(db, materials, signals);
})

describe('update', () => {
    test('creates a line', () => {
        makeCurve.points.push(new THREE.Vector3());
        makeCurve.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve.points.push(new THREE.Vector3(2, -1, 0));
        makeCurve.update();
    });
});

describe('commit', () => {
    test.only('invokes the appropriate c3d commands', () => {
        makeCurve.points.push(new THREE.Vector3());
        makeCurve.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve.points.push(new THREE.Vector3(2, -1, 0));
        makeCurve.commit();
        const item = db.scene.children[0] as visual.SpaceInstance;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        expect(item.underlying).toBeInstanceOf(visual.Curve3D);
    })
})