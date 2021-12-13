/**
 * @jest-environment jsdom
 */
import { Viewport } from "../../src/components/viewport/Viewport";
import { MoveControlPointCommand, ViewportPointControl } from "../../src/components/viewport/ViewportPointControl";
import { Editor } from "../../src/editor/Editor";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import * as visual from '../../src/visual_model/VisualModel';
import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import '../matchers';

let editor: Editor;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
});

let item: visual.SpaceInstance<visual.Curve3D>;
beforeEach(async () => {
    const makeCircle = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    item = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
});

const downEvent = new MouseEvent('down');
const upEvent = new MouseEvent('up');
describe(ViewportPointControl, () => {
    let points: ViewportPointControl;
    beforeEach(() => {
        points = new ViewportPointControl(viewport, editor);
    })
    afterEach(() => {
        points.dispose();
    })

    test('startClick []', () => {
        expect(points.startClick([], downEvent)).toBe(false);
    })

    test('startClick [not control point]', () => {
        expect(points.startClick([], downEvent)).toBe(false);
    })

    test('startClick [control point]', () => {
        expect(points.startClick([{ object: item.underlying.points.get(0), point: new THREE.Vector3() }], downEvent)).toBe(true);
    })

    test('startClick & endClick changes selection', () => {
        expect(points.startClick([{ object: item.underlying.points.get(0), point: new THREE.Vector3() }], downEvent)).toBe(true);
        const enqueue = jest.spyOn(editor, 'enqueue');
        points.endClick([{ object: item.underlying.points.get(0), point: new THREE.Vector3() }], upEvent);
        expect(enqueue).toBeCalledTimes(1);
    })

    test('startClick & startDrag enqueues move command', async () => {
        expect(points.startClick([{ object: item.underlying.points.get(0), point: new THREE.Vector3() }], downEvent)).toBe(true);
        let command: any;
        const enqueue = jest.spyOn(editor, 'enqueue').mockImplementation((c, _) => {
            command = c;
            return Promise.resolve();
        })
        points.startDrag(new MouseEvent('move'), new THREE.Vector2());
        expect(enqueue).toBeCalledTimes(1);
        expect(command).toBeInstanceOf(MoveControlPointCommand);

        const cb = jest.fn();
        const promise = points.execute(cb);

        expect(cb).toBeCalledTimes(0);
        points.continueDrag(new MouseEvent('move'), new THREE.Vector2());
        expect(cb).toBeCalledTimes(1);

        points.endDrag(new THREE.Vector2());

        await promise;
    })
})