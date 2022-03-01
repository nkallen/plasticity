/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { SnapIndicator } from "../../src/command/SnapIndicator";
import { SnapPresentation, SnapPresenter } from "../../src/command/SnapPresenter";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from "../../src/editor/Editor";
import { GizmoSnapPicker } from "../../src/editor/snaps/GizmoSnapPicker";
import { PlaneSnap, PointSnap } from '../../src/editor/snaps/Snap';
import { SnapManagerGeometryCache } from "../../src/editor/snaps/SnapManagerGeometryCache";
import { SnapResult } from "../../src/editor/snaps/SnapPicker";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let indicator: SnapIndicator;
let editor: Editor;
let viewport: Viewport;
let picker: GizmoSnapPicker;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
    indicator = new SnapIndicator(editor.gizmos);
    picker = new GizmoSnapPicker();
});

describe(SnapPresentation, () => {
    test("it gives info for best snap and names other possible snaps", () => {
        const hitPosition = new THREE.Vector3(1, 1, 1);
        const orientation = new THREE.Quaternion();
        const startPoint = new PointSnap("startpoint", new THREE.Vector3(1, 1, 1));
        const endPoint = new PointSnap("endpoint", new THREE.Vector3(1, 1, 1));
        const snapResults: SnapResult[] = [
            { snap: endPoint, position: hitPosition, cursorPosition: hitPosition, orientation, cursorOrientation: orientation },
            { snap: startPoint, position: hitPosition, cursorPosition: hitPosition, orientation, cursorOrientation: orientation }
        ];
        const presentation = new SnapPresentation([], snapResults, new PlaneSnap(), new THREE.Camera(), indicator, []);

        expect(presentation.names).toEqual(["endpoint", "startpoint"]);
        expect(presentation.info!.position).toBe(hitPosition);
        expect(presentation.info!.snap).toBe(endPoint);
    });
});

describe(SnapPresenter, () => {
    let presenter: SnapPresenter;

    beforeEach(() => {
        presenter = new SnapPresenter(editor);
    })

    describe('execute', () => {
        test('it adds and removes helpers', () => {
            expect(editor.helpers.scene.children.length).toBe(0);
            expect(viewport.additionalHelpers.size).toBe(0);

            const dispose = presenter.execute();
            expect(editor.helpers.scene.children.length).toBe(1);
            expect(viewport.additionalHelpers.size).toBe(1);

            dispose.dispose();
            expect(editor.helpers.scene.children.length).toBe(0);
            expect(viewport.additionalHelpers.size).toBe(0);
        })
    })

    describe('onPointerMove', () => {
        let presentation: SnapPresentation;

        beforeEach(() => {
            presenter.execute();
            picker.setFromViewport(new MouseEvent('down'), viewport);
            presentation = SnapPresentation.makeForGizmo(picker, viewport, editor.db, editor.snaps.cache, editor.gizmos).presentation;
        })

        test('when presentation.info is undefined', () => {
            expect(editor.helpers.scene.children[0].visible).toBe(false);
            presenter.onPointerMove(viewport, { info: undefined, nearby: [] } as SnapPresentation);
            expect(editor.helpers.scene.children[0].visible).toBe(false);
        })

        test('when presentation.info is not undefined', () => {
            expect(editor.helpers.scene.children[0].visible).toBe(false);
            presenter.onPointerMove(viewport, { info: { position: new THREE.Vector3(), cursorPosition: new THREE.Vector3() }, nearby: [], helpers: [], names: [] } as SnapPresentation);
            expect(editor.helpers.scene.children[0].visible).toBe(true);
        })
    })
})