import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from "../../src/visual_model/VisualModel";
import * as builder from "../../src/visual_model/VisualModelBuilder";
import { RenderedSceneBuilder } from "../../src/visual_model/RenderedSceneBuilder";
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";

let materials: MaterialDatabase;
let makeSphere: SphereFactory;
let makeLine: LineFactory;
let makeCircle: CenterCircleFactory;
let db: GeometryDatabase;
let signals: EditorSignals;
let makeRegion: RegionFactory;
let highlighter: RenderedSceneBuilder;
let selection: SelectionDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeSphere = new SphereFactory(db, materials, signals);
    makeLine = new LineFactory(db, materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
    selection = new SelectionDatabase(db, materials, signals);
    highlighter = new RenderedSceneBuilder(db, materials, selection, signals);
});

test('ok', () => {});