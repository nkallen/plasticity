import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { point2point } from '../src/util/Conversion';
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let box: c3d.Solid;

const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(1, 1, 1),
]

const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);

    box = c3d.ActionSolid.ElementarySolid(points.map(p => point2point(p)), c3d.ElementaryShellType.Block, names);
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
});

test("addItem with explicit name", async () => {
    expect(db.visibleObjects.length).toBe(0);
    expect(db.temporaryObjects.children.length).toBe(0);

    const v = await db.addItem(box, 'user', 100) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);

    const box2 = c3d.ActionSolid.ElementarySolid(points.map(p => point2point(p)), c3d.ElementaryShellType.Block, names);
    const n = await db.addItem(box) as visual.Solid;
    expect(n.simpleName).toBe(101);
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(2);
});


test("addItem & replaceItem", async () => {
    expect(db.visibleObjects.length).toBe(0);
    expect(db.temporaryObjects.children.length).toBe(0);

    const view1 = await db.addItem(box) as visual.Solid;
    const { model: model1 } = db.lookupItemById(view1.simpleName);
    expect(model1).toBe(box);

    const bbox = new THREE.Box3();
    bbox.setFromObject(view1);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));

    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(-1, -1, 0),
        new THREE.Vector3(-1, -1, -1),
    ]
    const box2 = c3d.ActionSolid.ElementarySolid(points.map(p => point2point(p)), c3d.ElementaryShellType.Block, names);
    const view2 = await db.replaceItem(view1, box2);
    expect(view2.simpleName).not.toBe(view1.simpleName);

    bbox.setFromObject(view2);
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, -0.5, 0.5));

    expect(() => db.lookupItemById(view1.simpleName)).toThrow();

})

test("saveToMemento & restoreFromMemento", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);

    const memento = db.saveToMemento();

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
    for (const face of v.faces) {
        expect(db.lookupTopologyItem(face)).toBeTruthy();
    }
})

describe("addTemporaryItem", () => {
    test("cancel", async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(0);
        expect(db.selectableObjects.length).toBe(0);

        const temp = await db.addTemporaryItem(box);
        expect(db.temporaryObjects.children.length).toBe(1);
        expect(db.visibleObjects.length).toBe(0);
        expect(db.selectableObjects.length).toBe(0);

        temp.cancel();

        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(0);
        expect(db.selectableObjects.length).toBe(0);
    });
});

test("lookupTopologyItemById", async () => {
    const solid = await db.addItem(box) as visual.Solid;
    expect(db.visibleObjects.length).toBe(1);

    const faces: visual.Face[] = [];
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
    const curve = c3d.ActionCurve3D.SplineCurve(points.map(p => point2point(p)), false, c3d.SpaceType.Hermit3D);
    const instance = await db.addItem(new c3d.SpaceInstance(curve)) as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    const controlPoints: visual.ControlPointGroup[] = [];
    instance.traverse(o => {
        if (o instanceof visual.ControlPointGroup) controlPoints.push(o);
    })
    expect(controlPoints.length).toBe(1);

    const { index, views } = db.lookupControlPointById(controlPoints[0].get(0).simpleName);
    expect(views.size).toBe(1);
    expect(index).toBe(0);

    db.removeItem(instance);
    expect(() => db.lookupControlPointById(controlPoints[0].get(0).simpleName)).toThrow();
});

test("find", async () => {
    expect(db.find(visual.Solid).length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;

    let [{ view, model }] = db.find(visual.Solid);
    expect(view).toBe(v);

    expect(db.find(visual.SpaceInstance).length).toBe(0);
    expect(db.find(visual.PlaneInstance).length).toBe(0);
});

test("duplicate solid", async () => {
    const view = await db.addItem(box) as visual.Solid;
    const dup = await db.duplicate(view);
    expect(dup).not.toBe(view);

    const bbox_original = new THREE.Box3();
    bbox_original.setFromObject(view);

    const bbox_dup = new THREE.Box3();
    bbox_dup.setFromObject(dup);

    expect(bbox_original.equals(bbox_dup)).toBe(true);
});

test("duplicate edge", async () => {
    const view = await db.addItem(box) as visual.Solid;
    const edge = view.edges.get(0);
    const dup = await db.duplicate(edge);

    const bbox = new THREE.Box3();
    bbox.setFromObject(view);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
})


test("serialize & deserialize", async () => {
    const view = await db.addItem(box, 'user', 10) as visual.Solid;
    const data = await db.serialize();
    expect(view.simpleName).toBe(10);

    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    expect(db.visibleObjects.length).toBe(0);

    await db.deserialize(data);
    expect(db.visibleObjects.length).toBe(1);

    expect(db.visibleObjects[0].simpleName).toBe(10);
})
