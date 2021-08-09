import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from "../src/commands/ContourManager";
import LineFactory from "../src/commands/line/LineFactory";
import { RegionFactory } from "../src/commands/region/RegionFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlanarCurveDatabase } from "../src/editor/PlanarCurveDatabase";
import { RegionManager } from "../src/editor/RegionManager";
import * as visual from "../src/editor/VisualModel";
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
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

test('raycast simple solid', async () => {
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    const item = await makeSphere.commit() as visual.Solid;
    item.updateMatrixWorld();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);

    item.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Mesh.threshold = 0;
    raycaster.layers = visual.SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    let intersections = raycaster.intersectObject(item, true);
    intersections = visual.filter(intersections);

    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Face);
});

test('raycast SpaceInstance<Curve3D>', async () => {
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(5, 5, 5);
    const item = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
    item.updateMatrixWorld();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    item.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.layers = visual.SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    raycaster.layers.disable(visual.Layers.ControlPoint);
    let intersections = raycaster.intersectObject(item, true);
    intersections = visual.filter(intersections);
    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Curve3D);

    raycaster.layers.enable(visual.Layers.ControlPoint);
    intersections = raycaster.intersectObject(item, true);
    intersections = visual.filter(intersections);
    expect(intersections.length).toBe(2);
    expect(intersections[0].object).toBeInstanceOf(visual.Curve3D);
    expect(intersections[1].object).toBeInstanceOf(visual.ControlPoint);
});

test('raycast PlaneInstance<Region>', async () => {
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    makeRegion.contours = [circle];
    const regions = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    const region = regions[0];

    region.updateMatrixWorld();

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    region.lod.update(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.layers = visual.SelectableLayers;
    const pointer = { x: 0, y: 0 };
    raycaster.setFromCamera(pointer, camera);

    let intersections = raycaster.intersectObject(region, true);
    intersections = visual.filter(intersections);
    expect(intersections.length).toBe(1);
    expect(intersections[0].object).toBeInstanceOf(visual.Region);
});

