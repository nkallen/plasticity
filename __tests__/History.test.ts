import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { SelectionManager } from '../src/selection/SelectionManager';
import { SnapManager } from '../src/editor/SnapManager';
import { SpriteDatabase } from '../src/editor/SpriteDatabase';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import './matchers';

describe("saveToMemento", () => {
    let db: GeometryDatabase;
    let materials: Required<MaterialDatabase>;
    let signals: EditorSignals;
    let snaps: SnapManager;
    let selection: SelectionManager;
    let sprites: Required<SpriteDatabase>;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
        sprites = new FakeSprites();
        snaps = new SnapManager(db, sprites, signals);
        selection = new SelectionManager(db, materials, signals);
    });

    test("sth", () => {
        const registry = new Map();
        const m1 = db.saveToMemento(registry);
        const m2 = selection.saveToMemento(registry);
        const m3 = snaps.saveToMemento(registry);
        expect(1).toBe(1);
    })
})