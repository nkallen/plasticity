import * as THREE from "three";
import LineFactory from "../src/commands/line/LineFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/Editor";
import { GeometryDatabase } from "../src/GeometryDatabase";
import MaterialDatabase from '../src/MaterialDatabase';
import * as visual from "../src/VisualModel";
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
});

describe('materials are consistent across LODs', () => {
    test("face & edge", () => {
        // First make an object with two LODs
        const makeSolid = new visual.SolidBuilder();

        const makeEdges1 = new visual.CurveEdgeGroupBuilder();
        const edge1 = new visual.CurveEdge({ position: [1, 2, 3] }, materials.line(), materials.lineDashed());
        makeEdges1.addEdge(edge1);

        const makeFaces1 = new visual.FaceGroupBuilder();
        const face1 = new visual.Face({}, materials.mesh());
        makeFaces1.addFace(face1);

        const makeEdges2 = new visual.CurveEdgeGroupBuilder();
        const edge2 = new visual.CurveEdge({ position: [1, 2, 3] }, materials.line(), materials.lineDashed());
        makeEdges1.addEdge(edge2);

        const makeFaces2 = new visual.FaceGroupBuilder();
        const face2 = new visual.Face({}, materials.mesh());
        makeFaces2.addFace(face2);

        makeSolid.addLOD(makeEdges1.build(), makeFaces1.build());
        makeSolid.addLOD(makeEdges2.build(), makeFaces2.build());
        const solid = makeSolid.build();

        // preconditins
        expect(edge1.material).toBe(materials.line(edge1));
        expect(edge2.material).toBe(materials.line(edge2));
        expect(face1.material).toBe(materials.mesh(face1));
        expect(face2.material).toBe(materials.mesh(face2));

        // now check materials are coherent across lods
        edge1.material = materials.highlight(edge1);
        expect(edge1.material).toBe(materials.highlight(edge1));
        expect(edge2.material).toBe(materials.highlight(edge2));

        face1.material = materials.highlight(face1);
        expect(face1.material).toBe(materials.highlight(face1));
        expect(face2.material).toBe(materials.highlight(face2));
    });

    test("curve3d", async () =>  {
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const inst = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        const curve0 = inst.lod.children[0] as visual.Curve3D;
        const curve1 = inst.lod.children[1] as visual.Curve3D;
        const segment0 = curve0.get(0);
        const segment1 = curve1.get(0);

        expect(inst.lod.children.length).toBe(3);

        expect(segment0.material).toBe(materials.line(segment0));
        expect(segment1.material).toBe(materials.line(segment1));
        segment0.material = materials.highlight(segment0);
        expect(segment0.material).toBe(materials.highlight(segment0));
        expect(segment1.material).toBe(materials.highlight(segment1));
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