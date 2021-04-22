import * as THREE from "three";
import BoxFactory from "../src/commands/box/BoxFactory";
import FilletFactory from "../src/commands/fillet/FilletFactory";
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let fillet: FilletFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    fillet = new FilletFactory(db, materials, signals);
})

describe('update', () => {
    test('when a fillet succeeds then fails, it rolls back to previous version', () => {
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        makeBox.commit();
        const solid = db.scene.children[0] as visual.Solid;
        expect(solid).toBeInstanceOf(visual.Solid);

        fillet.item = solid;
        fillet.edges = [solid.edges.get(2)];
        fillet.transaction(['distance'], () => {
            fillet.distance = 0.01;
            fillet.update();
        });
        expect(fillet.distance).toBe(0.01);

        fillet.transaction(['distance'], () => {
            fillet.distance = 0.1;
            fillet.update();
        });
        expect(fillet.distance).toBe(0.1);

        fillet.transaction(['distance'], () => {
            fillet.distance = 100;
            fillet.update();
        });
        expect(fillet.distance).toBe(0.1);
    });
});
