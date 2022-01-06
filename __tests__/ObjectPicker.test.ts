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

let item1: visual.SpaceInstance<visual.Curve3D>;
let item2: visual.SpaceInstance<visual.Curve3D>;
beforeEach(async () => {
    const makeCircle1 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle1.center = new THREE.Vector3();
    makeCircle1.radius = 1;
    item1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

    const makeCircle2 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle2.center = new THREE.Vector3(1,1,1);
    makeCircle2.radius = 1;
    item2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

});

describe(ObjectPicker, () => {
    test('execute disabled & re-enables viewport controls', async () => {
        expect(viewport.multiplexer.enabled).toBe(true);
        expect(viewport.navigationControls.enabled).toBe(true);

        const objectPicker = new ObjectPicker(editor);
        const promise = objectPicker.execute(() => { });

        expect(viewport.multiplexer.enabled).toBe(false);
        expect(viewport.navigationControls.enabled).toBe(true);

        promise.finish();
        await promise;

        expect(viewport.multiplexer.enabled).toBe(true);
        expect(viewport.navigationControls.enabled).toBe(true);
    })

    test('adds and removes event listeners', async () => {
        const objectPicker = new ObjectPicker(editor);

        const addEventListener = jest.spyOn(viewport.renderer.domElement, 'addEventListener');
        const promise = objectPicker.execute(() => { });
        expect(addEventListener).toBeCalledTimes(3);

        const removeEventListener = jest.spyOn(viewport.renderer.domElement, 'removeEventListener');
        promise.finish();
        expect(removeEventListener).toBeCalledTimes(3);
        await promise;
    })

    test('allows for locally scoped signals', async () => {
        const temp = selection.makeTemporary();
        const objectPicker = new ObjectPicker(editor, temp);
        let privateCount = 0;
        let publicCount = 0;
        temp.signals.objectSelected.add(() => privateCount++);
        editor.signals.objectSelected.add(() => publicCount++);
        temp.selected.addCurve(item1);
        expect(privateCount).toBe(1);
        expect(publicCount).toBe(0);
        expect(temp.selected.curves.size).toBe(1);
    })

    test('when an object is deleted, it is also removed from the selection', async () => {
        const temp = selection.makeTemporary();
        const objectPicker = new ObjectPicker(editor, temp);
        const promise = objectPicker.execute(() => { });
        temp.selected.addCurve(item1);
        expect(temp.selected.curves.size).toBe(1);
        await db.removeItem(item1);
        expect(temp.selected.curves.size).toBe(0);
        promise.finish();
        await promise;
    })

    test('when an object is deleted, no infinite loop when selection is global', async () => {
        const objectPicker = new ObjectPicker(editor, selection);
        const promise = objectPicker.execute(() => { });
        selection.selected.addCurve(item1);
        expect(selection.selected.curves.size).toBe(1);
        await db.removeItem(item1);
        expect(selection.selected.curves.size).toBe(0);
        promise.finish();
        await promise;
    })

    describe('shift', () => {
        test('shift, when enough already selected', async () => {
            editor.selection.selected.addCurve(item1);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);
            const result = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result]).toEqual([item1]);
        })

        test('shift, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(item1);
            editor.selection.selected.addCurve(item2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([item1]);

            const result2 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result2]).toEqual([item2]);
        })
    })

    describe('slice', () => {
        test('slice, when enough already selected', async () => {
            editor.selection.selected.addCurve(item1);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);
            const result = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result]).toEqual([item1]);
        })

        test('slice, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(item1);
            editor.selection.selected.addCurve(item2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([item1]);

            const result2 = await objectPicker.slice(SelectionMode.Curve, 2);
            expect([...result2]).toEqual([item1, item2]);
        })
    })

    describe('shift & slice', () => {
        test('slice, when more than enough already selected', async () => {
            editor.selection.selected.addCurve(item1);
            editor.selection.selected.addCurve(item2);
            const objectPicker = new ObjectPicker(editor);
            objectPicker.copy(editor.selection);

            const result1 = await objectPicker.shift(SelectionMode.Curve, 1);
            expect([...result1]).toEqual([item1]);

            const result2 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result2]).toEqual([item2]);

            const result3 = await objectPicker.slice(SelectionMode.Curve, 1);
            expect([...result3]).toEqual([item2]);
        })
    })
});

describe(ObjectPickerViewportSelector, () => {
    let selector: ObjectPickerViewportSelector;
    let selection: SelectionDatabase;
    let onEmptyIntersection: jest.Mock<any, any>;

    beforeEach(() => {
        selection = new SelectionDatabase(db, editor.materials, editor.signals);
        onEmptyIntersection = jest.fn();
        selector = new ObjectPickerViewportSelector(viewport, editor, selection, onEmptyIntersection, {});
    });

    test('processClick empty', () => {
        expect(onEmptyIntersection).toBeCalledTimes(0);
        selector.processClick([], new MouseEvent('up'));
        expect(onEmptyIntersection).toBeCalledTimes(1);
    });

    test('processClick non-empty', () => {
        expect(selection.selected.curves.size).toBe(0);
        expect(onEmptyIntersection).toBeCalledTimes(0);
        selector.processClick([{ object: item1.underlying, point: new THREE.Vector3() }], new MouseEvent('up'));
        expect(onEmptyIntersection).toBeCalledTimes(0);
        expect(selection.selected.curves.size).toBe(1);
    });
});