import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { SelectionBox } from "../../src/selection/SelectionBox";
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

    test('containsGeometry full containment', async () => {
        const edge = box.edges.get(0);

        const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.001);
        camera.position.set(0, -10, 0);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        const boxcaster = new SelectionBox(camera);
        boxcaster.startPoint.set(-1, -1, 0);
        boxcaster.endPoint.set(1, 1, 0);
        boxcaster.updateFrustum();
        expect(edge.containsGeometry(boxcaster)).toBe(true);
    });

    test('containsGeometry only intersection', async () => {
        const edge = box.edges.get(0);

        const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.001);
        camera.position.set(0, -10, 0);
        camera.lookAt(0, 0, 0);
        const boxcaster = new SelectionBox(camera);
        boxcaster.startPoint.set(-0.1, -0.1, 0);
        boxcaster.endPoint.set(0.1, 0.1, 0);
        boxcaster.updateFrustum();
        expect(edge.containsGeometry(boxcaster)).toBe(false);
    });
});

