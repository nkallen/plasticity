/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ObjectPicker, ObjectPickerViewportSelector } from "../src/command/ObjectPicker";
import { Viewport } from "../src/components/viewport/Viewport";
import { Editor } from "../src/editor/Editor";
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { ChangeSelectionExecutor, SelectionMode } from "../src/selection/ChangeSelectionExecutor";
import { SelectionDatabase, ToggleableSet } from "../src/selection/SelectionDatabase";
import * as visual from '../src/visual_model/VisualModel';
import { MakeViewport } from "../__mocks__/FakeViewport";
import './matchers';
import { ThreePointBoxFactory } from "../src/commands/box/BoxFactory";

let db: GeometryDatabase;
let changeSelection: ChangeSelectionExecutor;
let selection: SelectionDatabase;
let editor: Editor;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);

    db = editor._db;
    selection = editor._selection;
    changeSelection = editor.changeSelection;
})

let curve1: visual.SpaceInstance<visual.Curve3D>;
let curve2: visual.SpaceInstance<visual.Curve3D>;
let box: visual.Solid;

beforeEach(async () => {
    const makeCircle1 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle1.center = new THREE.Vector3();
    makeCircle1.radius = 1;
    curve1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeCircle2 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle2.center = new THREE.Vector3(1, 1, 1);
    makeCircle2.radius = 1;
    curve2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeBox = new ThreePointBoxFactory(editor.db, editor.materials, editor.signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    box = await makeBox.commit() as visual.Solid;
});

describe(ObjectPicker, () => {
    test('execute disables & re-enables viewport controls', async () => {
        expect(viewport.multiplexer.enabled).toBe(true);
        expect(viewport.selector.enabled).toBe(true);
        expect(viewport.points.enabled).toBe(true);
        expect(viewport.navigationControls.enabled).toBe(true);

        const objectPicker = new ObjectPicker(editor);
        const promise = objectPicker.execute(() => { });

        expect(viewport.multiplexer.enabled).toBe(true);
        expect(viewport.selector.enabled).toBe(false);
        expect(viewport.points.enabled).toBe(false);
        expect(viewport.navigationControls.enabled).toBe(true);

        promise.finish();
        await promise;

        expect(viewport.multiplexer.enabled).toBe(true);
        expect(viewport.selector.enabled).toBe(true);
        expect(viewport.points.enabled).toBe(true);
        expect(viewport.navigationControls.enabled).toBe(true);
    })

    test('adds and removes to multiplexer', async () => {
        const objectPicker = new ObjectPicker(editor);

        expect(viewport.multiplexer.controls.size).toBe(2);
        const promise = objectPicker.execute(() => { });
        expect(viewport.multiplexer.controls.size).toBe(3);
        promise.finish();
        await promise;
        expect(viewport.multiplexer.controls.size).toBe(2);
    })

    test('adds and removes temporary selection for highlighter', async () => {
        const objectPicker = new ObjectPicker(editor);

        const useTemporary = jest.spyOn(editor.highlighter, 'useTemporary');
        const promise = objectPicker.execute(() => { });
        expect(useTemporary).toBeCalledTimes(1);

        promise.finish();
        await promise;
    })

    test('allows for locally scoped signals', async () => {
        const temp = selection.makeTemporary();
        const objectPicker = new ObjectPicker(editor, temp);
        let privateCount = 0;
        let publicCount = 0;
        temp.signals.objectSelected.add(() => privateCount++);
        editor.signals.objectSelected.add(() => publicCount++);
        temp.selected.addCurve(curve1);
        expect(privateCount).toBe(1);
        expect(publicCount).toBe(0);
        expect(temp.selected.curves.size).toBe(1);
    })

    test('when an object is deleted, it is also removed from the selection', async () => {
        const temp = selection.makeTemporary();
        const objectPicker = new ObjectPicker(editor, temp);
        const promise = objectPicker.execute(() => { }, 1, Number.MAX_SAFE_INTEGER);
        temp.selected.addCurve(curve1);
        expect(temp.selected.curves.size).toBe(1);
        await db.removeItem(curve1);
        expect(temp.selected.curves.size).toBe(0);
        promise.finish();
        await promise;
    })

    test('when an object is deleted, no infinite loop when selection is global', async () => {
        const objectPicker = new ObjectPicker(editor, selection);
        const promise = objectPicker.execute(() => { });
        selection.selected.addCurve(curve1);
        expect(selection.selected.curves.size).toBe(1);
        await db.removeItem(curve1);
        expect(selection.selected.curves.size).toBe(0);
        promise.finish();
        await promise;
    })

    describe('copy', () => {
        test('when no modes specified, copies everything', () => {
            editor.selection.selected.addCurve(curve1);
            editor.selection.selected.addCurve(curve2);
            editor.selection.selected.addSolid(box);

            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);
            expect(objectPicker.selection.selected.solids.size).toBe(1);
            expect(objectPicker.selection.selected.curves.size).toBe(2);
        })

        test('when a mode is specified, copies only that mode', () => {
            editor.selection.selected.addCurve(curve1);
            editor.selection.selected.addCurve(curve2);
            editor.selection.selected.addFace(box.faces.get(1));

            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection, SelectionMode.Face);
            expect(objectPicker.selection.selected.faces.size).toBe(1);
            expect(objectPicker.selection.selected.curves.size).toBe(0);
        })

    })

    describe('shift', () => {
        test('shift, when enough already selected', async () => {
            editor.selection.selected.addCurve(curve1);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);
            const result = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result]).toEqual([curve1]);
        })

        test('shift, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(curve1);
            editor.selection.selected.addCurve(curve2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([curve1]);

            const result2 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result2]).toEqual([curve2]);
        })
    })

    describe('slice', () => {
        test('slice, when enough already selected', async () => {
            editor.selection.selected.addCurve(curve1);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);
            const result = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result]).toEqual([curve1]);
        })

        test('slice, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(curve1);
            editor.selection.selected.addCurve(curve2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([curve1]);

            const result2 = await objectPicker.slice(SelectionMode.Curve, 2);
            expect([...result2]).toEqual([curve1, curve2]);
        })
    })

    describe('shift & slice', () => {
        test('slice, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(curve1);
            editor.selection.selected.addCurve(curve2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([curve1]);

            const result2 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result2]).toEqual([curve2]);

            const result3 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result3]).toEqual([curve2]);
        })
    })
});
