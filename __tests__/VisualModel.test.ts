import * as THREE from "three";
import LineFactory from "../src/commands/line/LineFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/Editor";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from "../src/editor/VisualModel";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from "../__mocks__/FakeSignals";

let materials: MaterialDatabase;
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

test('constructs solids', () => {
    const makeEdges = new visual.CurveEdgeGroupBuilder();
    const edge = visual.CurveEdge.build({ position: [1, 2, 3] }, 0, materials.line(), materials.lineDashed());
    makeEdges.addEdge(edge);

    const makeFaces = new visual.FaceGroupBuilder();
    const face = visual.Face.build({}, 0, materials.mesh());
    makeFaces.addFace(face);

    const makeSolid = new visual.SolidBuilder();
    makeSolid.addLOD(makeEdges.build(), makeFaces.build());
    const solid = makeSolid.build();
});

test('constructs curves', () => {
    const makeSpaceInstance = new visual.SpaceInstanceBuilder();
    const makeCurve = new visual.Curve3DBuilder();
    const line = visual.CurveSegment.build({ position: [1, 2, 3] }, materials.line());
    makeCurve.addCurveSegment(line);
    makeSpaceInstance.addLOD(makeCurve.build())
});

describe('materials are consistent across LODs', () => {
    test("face & edge", () => {
        // First make an object with two LODs
        const makeSolid = new visual.SolidBuilder();

        const makeEdges1 = new visual.CurveEdgeGroupBuilder();
        const edge1 = visual.CurveEdge.build({ position: [1, 2, 3] }, 0, materials.line(), materials.lineDashed());
        makeEdges1.addEdge(edge1);

        const makeFaces1 = new visual.FaceGroupBuilder();
        const face1 = visual.Face.build({}, 0, materials.mesh());
        makeFaces1.addFace(face1);

        const makeEdges2 = new visual.CurveEdgeGroupBuilder();
        const edge2 = visual.CurveEdge.build({ position: [1, 2, 3] }, 0, materials.line(), materials.lineDashed());
        makeEdges1.addEdge(edge2);

        const makeFaces2 = new visual.FaceGroupBuilder();
        const face2 = visual.Face.build({}, 0, materials.mesh());
        makeFaces2.addFace(face2);

        makeSolid.addLOD(makeEdges1.build(), makeFaces1.build());
        makeSolid.addLOD(makeEdges2.build(), makeFaces2.build());
        const solid = makeSolid.build();
        expect(solid.lod.children.length).toBe(2);
    });

    test("curve3d", async () => {
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const inst = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        expect(inst.lod.children.length).toBe(3);
    })
});

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
    makeLine.p2 = new THREE.Vector3(1, 1, 0);
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