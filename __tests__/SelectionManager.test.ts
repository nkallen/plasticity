import { IntersectionFactory } from '../src/commands/Boolean';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let intersect: IntersectionFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    intersect = new IntersectionFactory(db, materials, signals);
})
