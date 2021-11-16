import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from "../../src/editor/VisualModel";
import { HighlightManager } from "../../src/editor/HighlightManager";
import { SelectionManager } from "../../src/selection/SelectionManager";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";

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

describe(visual.SolidBuilder, () => {
    test('compactTopologyId', () => {
        let edgeId, faceId;
        edgeId = visual.SolidBuilder.compactTopologyId('edge', 1, 2);
        faceId = visual.SolidBuilder.compactTopologyId('face', 1, 2);
        expect(visual.SolidBuilder.compact2full(edgeId)).toEqual('edge,1,2');
        expect(visual.SolidBuilder.compact2full(faceId)).toEqual('face,1,2');

        edgeId = visual.SolidBuilder.compactTopologyId('edge', 1024, 2048);
        faceId = visual.SolidBuilder.compactTopologyId('face', 1024, 2048);
        expect(visual.SolidBuilder.compact2full(edgeId)).toEqual('edge,1024,2048');
        expect(visual.SolidBuilder.compact2full(faceId)).toEqual('face,1024,2048');

    });
});

describe(visual.FaceGroupBuilder, () => {

});

describe(visual.CurveEdgeGroupBuilder, () => {

});