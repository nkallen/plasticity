import * as THREE from "three";
import { Curve } from "three";
import { CutFactory, IntersectionFactory } from '../src/commands/Boolean';
import CurveFactory from "../src/commands/Curve";
import SphereFactory from '../src/commands/Sphere';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let intersect: IntersectionFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    intersect = new IntersectionFactory(db, materials, signals);
})

describe('intersection', () => {
    describe('commit', () => {
        test('invokes the appropriate c3d commands', () => {
            let makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(-0.5, -0.5, -0.5);
            makeSphere.radius = 1;
            makeSphere.commit();

            makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(0.5, 0.5, 0.5);
            makeSphere.radius = 1;
            makeSphere.commit();

            expect(db.scene.children.length).toBe(2);
            let [item1, item2] = db.scene.children as visual.Solid[];
            expect(item1).toBeInstanceOf(visual.Solid);
            expect(item2).toBeInstanceOf(visual.Solid);

            intersect.item1 = item1;
            intersect.item2 = item2;
            intersect.commit();
            const item = db.scene.children[0] as visual.Solid;
            expect(item).toBeInstanceOf(visual.Solid);
            expect(item).toHaveCentroidNear(new THREE.Vector3(0, 0, 0));
        })
    })
})

describe("cutting", () => {
    describe('commit', () => {
        test('takes a cutting curve and a solid and produces a divided solid', () => {
            const makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(0, 0, 0);
            makeSphere.radius = 1;
            makeSphere.commit();
            const sphere = db.scene.children[0] as visual.Solid;
            expect(sphere).toBeInstanceOf(visual.Solid);

            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            makeCurve.commit();
            const item = db.scene.children[1] as visual.SpaceInstance<visual.Curve3D>;
            expect(item).toBeInstanceOf(visual.SpaceInstance);
    
            const cut = new CutFactory(db, materials, signals);
            cut.solid = sphere;
            cut.contour = item;
            cut.commit();

            expect(db.scene.children.length).toBe(2);
            expect(db.scene.children[0]).toBeInstanceOf(visual.Solid);
            expect(db.scene.children[1]).toBeInstanceOf(visual.Solid);

        })
    })
})