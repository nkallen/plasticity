import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { SpriteDatabase } from '../src/editor/SpriteDatabase';
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let sprites: SpriteDatabase;
let signals: EditorSignals;
let box: c3d.Solid;

const points = [
    new c3d.CartPoint3D(0, 0, 0),
    new c3d.CartPoint3D(1, 0, 0),
    new c3d.CartPoint3D(1, 1, 0),
    new c3d.CartPoint3D(1, 1, 1),
]

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);

    const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
    box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
})

test("addItem & lookup & removeItem", async () => {
    expect(db.visibleObjects.length).toBe(0);
    expect(db.temporaryObjects.children.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);

    db.removeItem(v);
    expect(() => db.lookup(v)).toThrow();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);
})

test("saveToMemento & restoreFromMemento", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);

    const memento = db.saveToMemento(new Map());

    db.removeItem(v);
    expect(() => db.lookup(v)).toThrow();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);

    db.restoreFromMemento(memento);

    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);
})

test("hide & unhide", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);

    db.hide(v);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);

    db.unhide(v);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);
})

test("lookupTopologyItem", async () => {
    const v = await db.addItem(box) as visual.Solid;
    for (const edge of v.edges) {
        expect(db.lookupTopologyItem(edge)).toBeTruthy();
    }
})

describe("addTemporaryItem", () => {
    test("cancel", async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(0);

        const temp = await db.addTemporaryItem(box);
        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.visibleObjects.length).toBe(0);

        temp.cancel();

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(0);
    });
});

test("lookupTopologyItemById", async () => {
    const solid = await db.addItem(box) as visual.Solid;
    expect(db.visibleObjects.length).toBe(1);

    const faces = [];
    solid.traverse(o => {
        if (o instanceof visual.Face) faces.push(o);
    })
    expect(faces.length).toBe(2 * 6);

    expect(db.lookupTopologyItem(faces[0])).toBeTruthy();
    const { model, views } = db.lookupTopologyItemById(faces[0].simpleName);
    expect(views.size).toBe(2);
    expect(model).toBeInstanceOf(c3d.Face);

    db.removeItem(solid);
    expect(() => db.lookupTopologyItem(faces[0])).toThrow();
    expect(() => db.lookupTopologyItemById(faces[0].simpleName)).toThrow();
});

test("lookupControlPointById", async () => {
    const curve = c3d.ActionCurve3D.SplineCurve(points, false, c3d.SpaceType.Hermit3D);
    const instance = await db.addItem(new c3d.SpaceInstance(curve)) as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    const controlPoints = [];
    instance.traverse(o => {
        if (o instanceof visual.ControlPointGroup) controlPoints.push(o);
    })
    expect(controlPoints.length).toBe(2);

    const { index, views } = db.lookupControlPointById(controlPoints[0].findByIndex(0).simpleName);
    expect(views.size).toBe(2);
    expect(index).toBe(0);

    db.removeItem(instance);
    expect(() => db.lookupControlPointById(controlPoints[0].simpleName)).toThrow();
});
