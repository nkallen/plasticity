import * as THREE from "three";
import CurveFactory from '../src/commands/Curve';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let curve: CurveFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    curve = new CurveFactory(db, materials, signals);
})

describe('update', () => {
    test('creates a line', () => {
        curve.points.push(new THREE.Vector3());
        curve.points.push(new THREE.Vector3(1, 1, 0));
        curve.points.push(new THREE.Vector3(2, -1, 0));
        curve.update();
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        curve.points.push(new THREE.Vector3());
        curve.points.push(new THREE.Vector3(1, 1, 0));
        curve.points.push(new THREE.Vector3(2, -1, 0));
        curve.commit();
    })
})