import * as visual from "../src/VisualModel";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import MaterialDatabase from '../src/MaterialDatabase';
import * as THREE from "three";
import BoxFactory from "../src/commands/box/BoxFactory";
import { GeometryDatabase } from "../src/GeometryDatabase";
import { EditorSignals } from "../src/Editor";
import FakeSignals from "../__mocks__/FakeSignals";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import LineFactory from "../src/commands/line/LineFactory";

let materials: Required<MaterialDatabase>;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let db: GeometryDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
});

test('construction', () => {
    const makeEdges = new visual.CurveEdgeGroupBuilder();
    const edge = new visual.CurveEdge({ position: [1, 2, 3] }, materials.line(), materials.lineDashed());
    makeEdges.addEdge(edge);

    const makeFaces = new visual.FaceGroupBuilder();
    const face = new visual.Face({}, materials.mesh());
    makeFaces.addFace(face);

    const makeSolid = new visual.SolidBuilder();
    makeSolid.addLOD(makeEdges.build(), makeFaces.build());
    const solid = makeSolid.build();
})

test('raycast solid', async () => {
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 0.5;
    const item = await makeSphere.commit() as visual.Solid;

    const raycaster = new THREE.Raycaster();
    const pointer = { x: 0, y: 0 };
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObject(item);
    expect(intersections.length).toBe(3);
});

test('raycast instance<curve3d>', async () => {
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(1,1,0);
    const item = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    const raycaster = new THREE.Raycaster();
    const pointer = { x: 0, y: 0 };
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObject(item);
    expect(intersections.length).toBe(1);
});