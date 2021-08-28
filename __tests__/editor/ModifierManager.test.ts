import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import FilletFactory from '../../src/commands/fillet/FilletFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import ModifierManager, { ModifierStack } from "../../src/editor/ModifierManager";
import * as visual from '../../src/editor/VisualModel';
import { SelectionManager } from "../../src/selection/SelectionManager";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selection: SelectionManager;
let modifiers: ModifierManager;


beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
});

beforeEach(() => {
    modifiers = new ModifierManager(db, selection, materials, signals);
})

describe(ModifierManager, () => {
    let box: visual.Solid;
    let modification: ModifierStack;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(modifiers, materials, signals); // NOTE: passing in modifier rather than raw db as in most other tests
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    beforeEach(async () => {
        modification = await modifiers.add(box);
        expect(modification).not.toBeUndefined();
        expect(modification.modified).not.toBeUndefined();
    })

    test('adding a symmetry modifier', async () => {
        const bbox = new THREE.Box3();
        bbox.setFromObject(modification.modified);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        expect(db.visibleObjects.length).toBe(2);
    });

    test('replacing an item with a new one updates the modifier', async () => {
        const oldModified = modification.modified;

        const makeFillet = new FilletFactory(modifiers, materials, signals);
        makeFillet.solid = box;
        const edge = box.edges.get(0);
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        const filleted = await makeFillet.commit() as visual.Solid;

        expect(db.visibleObjects.length).toBe(2);

        expect(modifiers.get(box)).toBeUndefined();
        const newModification = modifiers.get(filleted) as ModifierStack;
        expect(newModification).not.toBeUndefined();
        expect(modification.modified).not.toBe(1);
        expect(newModification.modified).not.toBe(oldModified)

        const bbox = new THREE.Box3();
        bbox.setFromObject(newModification.modified);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });

    test('creating a temporary object updates the modifier', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(2);
        expect(modification.temp).toBeUndefined();

        const makeFillet = new FilletFactory(modifiers, materials, signals);
        makeFillet.solid = box;
        const edge = box.edges.get(0);
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        await makeFillet.update();

        expect(db.visibleObjects.length).toBe(2);
        expect(db.temporaryObjects.children.length).toBe(1);

        expect(modifiers.get(box)).toBe(modification);
        expect(modification.temp!.underlying).toBe(db.temporaryObjects.children[0]);

        await makeFillet.commit();
        // expect(modification.temp!).toBeUndefined();
    });

    test('removing an item removes the modifier db', async () => {
        expect(modifiers.get(box)).not.toBeUndefined();
        await modifiers.removeItem(box);
        expect(modifiers.get(box)).toBeUndefined();
    })

    test('duplicating an object...', () => {

    })

    test('when a modified item is selected & deselected', () => {
        const { modified, unmodified } = modification;
        expect(modified.visible).toBe(true);
        expect(unmodified.visible).toBe(false);

        selection.selected.addSolid(modified);

        expect(modified.visible).toBe(true);
        expect(unmodified.visible).toBe(true);
        for (const edge of modified.allEdges) {
            expect(edge.visible).toBe(false);
        }
        const unselectable = new THREE.Layers();
        unselectable.set(visual.Layers.Unselectable);
        modified.traverse(child => {
            expect(child.layers.mask).toBe(unselectable.mask);
        });

        selection.selected.removeSolid(modified);
        expect(modified.visible).toBe(true);
        expect(unmodified.visible).toBe(false);
        for (const edge of modified.allEdges) {
            expect(edge.visible).toBe(true);
        }
        modified.traverse(child => {
            expect(child.layers.mask).not.toBe(unselectable.mask);
        });
    });


    test('when a modified item is deselected', () => {

    })
});