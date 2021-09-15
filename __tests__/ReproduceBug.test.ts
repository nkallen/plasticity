import * as fs from 'fs';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from "../src/editor/VisualModel";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

test.skip("this crashes", async () => {
    const filePath = "/Users/nickkallen/Desktop/fillet-crash.c3d";
    const data = await fs.promises.readFile(filePath);
    await db.deserialize(data);
    const solid = db.find(visual.Solid)[0].model;
    const edge = solid.GetEdge(4)!

    const params = new c3d.SmoothValues();
    params.distance1 = 1000;
    params.distance2 = 1000;
    params.form = c3d.SmoothForm.Fillet;
    params.conic = 0;
    params.prolong = false;
    params.smoothCorner = c3d.CornerForm.uniform;
    params.begLength = -1e300;
    params.endLength = -1e300;
    params.keepCant = -1;
    params.strict = true;

    const fn = new c3d.CubicFunction(1, 1);
    const edgeFunction = new c3d.EdgeFunction(edge, fn);
    const edgeFunctions = [edgeFunction];
    
    const names = new c3d.SNameMaker(c3d.CreatorType.FilletSolid, c3d.ESides.SideNone, 0);
    c3d.ActionSolid.FilletSolid(solid, c3d.CopyMode.Copy, edgeFunctions, [], params, names);
});
