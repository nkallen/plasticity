import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import { Clone } from '../src/History';
import MaterialDatabase from '../src/MaterialDatabase';
import { SelectionManager } from '../src/selection/SelectionManager';
import { SnapManager } from '../src/SnapManager';
import { SpriteDatabase } from '../src/SpriteDatabase';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';


describe("Clone", () => {
    test("set", () => {
        const x = new Set([1,2,3]);
        expect(Clone(x)).toEqual(x);
    })

    test("registry is used to no reclone", () => {
        const reg = new Map();
        const i = {i: 'i'}, j = {j: 'j'}, k = {k: 'k'};
        const x = new Set([i]);
        const x_ = Clone(x, reg)
        expect(x_).toEqual(x);
        expect(Array.from(x_)[0]).not.toBe(i);

        const y = new Set([i,j,k]);
        const y_ = Clone(y, reg);
        expect(y_).toEqual(y);
        expect(Array.from(x_)[0]).toBe(Array.from(y_)[0]);
    })
});

describe("saveToMemento", () => {
    let db: GeometryDatabase;
    let materials: Required<MaterialDatabase>;
    let signals: EditorSignals;
    let snaps: SnapManager;
    let selection: SelectionManager;
    let sprites: Required<SpriteDatabase>;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = FakeSignals();
        db = new GeometryDatabase(materials, signals);
        sprites = new FakeSprites();
        snaps = new SnapManager(db,sprites,signals);
        selection = new SelectionManager(db, materials, signals);
    });

    test("sth", () => {
        const registry = new Map();
        db.saveToMemento(registry);
        expect(1).toBe(1);
    })
})