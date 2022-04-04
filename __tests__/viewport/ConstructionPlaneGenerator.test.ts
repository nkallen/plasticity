import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { ConstructionPlaneGenerator } from "../../src/components/viewport/ConstructionPlaneGenerator";
import { Orientation } from "../../src/components/viewport/ViewportNavigator";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { PlaneDatabase } from "../../src/editor/PlaneDatabase";
import { Scene } from "../../src/editor/Scene";
import { FaceConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { SnapManager } from "../../src/editor/snaps/SnapManager";
import { SolidCopier } from "../../src/editor/SolidCopier";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let signals: EditorSignals;
let scene: Scene;
let materials: MaterialDatabase;
let planes: PlaneDatabase;
let snaps: SnapManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    scene = new Scene(db, materials, signals);
    planes = new PlaneDatabase(signals);
    snaps = new SnapManager(db, scene, new CrossPointDatabase(), signals);
})

let solid: visual.Solid;
beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

let cplanes: ConstructionPlaneGenerator;

beforeEach(() => {
    cplanes = new ConstructionPlaneGenerator(db, planes, snaps);
})

test("constructionPlane(Face)", () => {
    const face = solid.faces.get(0);
    const result = cplanes.constructionPlaneForFace(face);
    expect(result.tag).toEqual('face');
    const f = result.cplane as FaceConstructionPlaneSnap;
    const faceSnap = snaps.identityMap.lookup(face);
    expect(f.faceSnap).toBe(faceSnap);
    expect(f.isCompatibleWithSnap(faceSnap)).toBe(false);
    expect(f.n).toApproximatelyEqual(new THREE.Vector3(0, 0, -1));
    expect(f.p).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
})

test("constructionPlane(Orientation)", () => {
    const result = cplanes.constructionPlaneForOrientation(Orientation.negX);
    const constructionPlane = result.cplane;
    expect(constructionPlane.n).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
    expect(constructionPlane.p).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
})