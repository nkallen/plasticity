import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { RegionFactory } from "../src/commands/region/RegionFactory";
import SphereFactory from "../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../src/editor/EditorSignals";
import { GeometryDatabase } from "../src/editor/GeometryDatabase";
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from "../src/editor/VisualModel";
import { HighlightManager } from "../src/selection/HighlightManager";
import { SelectionManager } from "../src/selection/SelectionManager";
import { FakeMaterials } from "../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;
let highlighter: HighlightManager;
let selection: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
    selection = new SelectionManager(db, materials, signals);
    highlighter = new HighlightManager(db, materials, selection, signals);
});

test('constructs solids', () => {
    const makeEdges = new visual.CurveEdgeGroupBuilder();
    const edge = visual.CurveEdge.build({ position: new Float32Array([1, 2, 3]) } as c3d.MeshBuffer, 0, materials.line(), materials.lineDashed());
    makeEdges.addEdge(edge);

    const makeFaces = new visual.FaceGroupBuilder();
    const face = visual.Face.mesh({} as c3d.MeshBuffer, 0, materials.mesh());
    makeFaces.add(face);

    const makeSolid = new visual.SolidBuilder();
    makeSolid.add(makeEdges.build(), makeFaces.build());
    const solid = makeSolid.build();
    expect(solid).toBeInstanceOf(visual.Solid);
});

test('optimize', () => {

})