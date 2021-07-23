import * as THREE from "three";
import { CutFactory, IntersectionFactory } from '../../src/commands/boolean/BooleanFactory';
import CurveFactory from "../../src/commands/curve/CurveFactory";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let intersect: IntersectionFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    intersect = new IntersectionFactory(db, materials, signals);
})

describe('intersection', () => {
    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            let makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(-0.5, -0.5, -0.5);
            makeSphere.radius = 1;
            const sphere1 = await makeSphere.commit() as visual.Solid;

            makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(0.5, 0.5, 0.5);
            makeSphere.radius = 1;
            const sphere2 = await makeSphere.commit() as visual.Solid;

            intersect.item1 = sphere1;
            intersect.item2 = sphere2;
            const intersection = await intersect.commit();
            expect(intersection).toHaveCentroidNear(new THREE.Vector3(0, 0, 0));
        })
    })
})

describe("cutting", () => {
    describe('commit', () => {
        test('takes a cutting curve and a solid and produces a divided solid', async () => {
            const makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(0, 0, 0);
            makeSphere.radius = 1;
            const sphere = await makeSphere.commit() as visual.Solid;

            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
    
            const cut = new CutFactory(db, materials, signals);
            cut.solid = sphere;
            cut.contour = curve;
            const result = await cut.commit() as visual.SpaceItem[];

            expect(result.length).toBe(2);
        })
    })
})