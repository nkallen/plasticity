import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Boxcaster } from "../../src/selection/Boxcaster";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(visual.CurveEdge, () => {
    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        box.updateMatrixWorld();
    })

    let camera: THREE.OrthographicCamera;
    let raycaster: THREE.Raycaster;
    beforeEach(() => {
        camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.001);
        camera.position.set(0, -10, 0);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        raycaster.layers.enableAll();
    })

    test('raycast', async () => {
        const edge = box.edges.get(0);
        const intersects = raycaster.intersectObject(edge);
        expect(intersects.length).toBe(1);
        expect(intersects[0].object).toBe(edge);
    });
});
