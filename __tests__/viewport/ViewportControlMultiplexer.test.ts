/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { Viewport } from "../../src/components/viewport/Viewport";
import { ViewportControlMultiplexer } from "../../src/components/viewport/ViewportControlMultiplexer";
import { ViewportPointControl } from "../../src/components/viewport/ViewportPointControl";
import { Editor } from "../../src/editor/Editor";
import { ViewportSelector } from "../../src/selection/ViewportSelector";
import { Intersection } from "../../src/visual_model/Intersectable";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

const moveEvent = new MouseEvent('move');
const downEvent = new MouseEvent('down');
const upEvent = new MouseEvent('up');

describe(ViewportControlMultiplexer, () => {
    let multiplexer: ViewportControlMultiplexer;
    let pointControl: ViewportPointControl;
    let selector: ViewportSelector;
    let viewport: Viewport;
    let editor: Editor;

    beforeEach(() => {
        editor = new Editor();
        viewport = MakeViewport(editor);
        editor.viewports.push(viewport);
    });

    beforeEach(() => {
        selector = new ViewportSelector(viewport, editor);
        pointControl = new ViewportPointControl(viewport, editor);
    });

    beforeEach(() => {
        multiplexer = new ViewportControlMultiplexer(viewport, editor.layers, editor.db, editor.signals);
    });

    afterEach(() => {
        multiplexer.dispose();
    })

    test('add & remove', () => {
        multiplexer.push(selector);
        multiplexer.push(pointControl);
        multiplexer.delete(selector);
        multiplexer.delete(pointControl);
    });

    test('hover multiplexes', () => {
        multiplexer.push(selector);
        multiplexer.push(pointControl);

        const startHover1 = jest.spyOn(selector, 'startHover');
        const continueHover1 = jest.spyOn(selector, 'continueHover');
        const endHover1 = jest.spyOn(selector, 'endHover');

        const startHover2 = jest.spyOn(pointControl, 'startHover');
        const continueHover2 = jest.spyOn(pointControl, 'continueHover');
        const endHover2 = jest.spyOn(pointControl, 'endHover');

        multiplexer.startHover([], moveEvent);
        expect(startHover1).toBeCalledTimes(1);
        expect(startHover2).toBeCalledTimes(1);

        multiplexer.continueHover([], moveEvent);
        expect(continueHover1).toBeCalledTimes(1);
        expect(continueHover2).toBeCalledTimes(1);

        multiplexer.endHover();
        expect(endHover1).toBeCalledTimes(1);
        expect(endHover2).toBeCalledTimes(1);
    });

    test('hover respects enabled', () => {
        multiplexer.push(selector);
        multiplexer.push(pointControl);

        const startHover1 = jest.spyOn(selector, 'startHover');
        const continueHover1 = jest.spyOn(selector, 'continueHover');
        const endHover1 = jest.spyOn(selector, 'endHover');

        const startHover2 = jest.spyOn(pointControl, 'startHover');
        const continueHover2 = jest.spyOn(pointControl, 'continueHover');
        const endHover2 = jest.spyOn(pointControl, 'endHover');

        pointControl.enable(false);

        multiplexer.startHover([], moveEvent);
        expect(startHover1).toBeCalledTimes(1);
        expect(startHover2).toBeCalledTimes(0);

        multiplexer.continueHover([], moveEvent);
        expect(continueHover1).toBeCalledTimes(1);
        expect(continueHover2).toBeCalledTimes(0);

        multiplexer.endHover();
        expect(endHover1).toBeCalledTimes(1);
        expect(endHover2).toBeCalledTimes(0);
    })

    describe('click picks a winner and delegates all subsequent commands', () => {
        beforeEach(() => {
            multiplexer.push(selector);
            multiplexer.push(pointControl);
        });

        test('when the first control returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(true);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(0);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(1);
            expect(endClick2).toHaveBeenCalledTimes(0);
        });

        test('when one is disabled', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(true);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            selector.enable(false);

            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(0);
            expect(startClick2).toHaveBeenCalledTimes(1);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(0);
            expect(endClick2).toHaveBeenCalledTimes(1);
        });

        test('when the second control returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(false);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(1);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(0);
            expect(endClick2).toHaveBeenCalledTimes(1);
        });

        test('when nobody returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(false);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(false);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(1);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(0);
            expect(endClick2).toHaveBeenCalledTimes(0);
        });

        describe('drag behavior', () => {
            test('when the first control returns true', () => {
                const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(true);
                const startDrag1 = jest.spyOn(selector, 'startDrag');
                const continueDrag1 = jest.spyOn(selector, 'continueDrag');
                const endDrag1 = jest.spyOn(selector, 'endDrag');

                const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
                const startDrag2 = jest.spyOn(pointControl, 'startDrag');
                const continueDrag2 = jest.spyOn(pointControl, 'continueDrag');
                const endDrag2 = jest.spyOn(pointControl, 'endDrag');

                multiplexer.startClick([], downEvent);
                expect(startClick1).toHaveBeenCalledTimes(1);
                expect(startClick2).toHaveBeenCalledTimes(0);

                multiplexer.startDrag(new MouseEvent('down'), new THREE.Vector2());
                expect(startDrag1).toHaveBeenCalledTimes(1);
                expect(startDrag2).toHaveBeenCalledTimes(0);

                multiplexer.continueDrag(new MouseEvent('move'), new THREE.Vector2());
                expect(continueDrag1).toHaveBeenCalledTimes(1);
                expect(continueDrag2).toHaveBeenCalledTimes(0);

                multiplexer.endDrag(new THREE.Vector2(), upEvent);
                expect(endDrag1).toHaveBeenCalledTimes(1);
                expect(endDrag2).toHaveBeenCalledTimes(0);
            });
        });
    });

    describe('unshift adds something of highest priority', () => {
        let priority: ViewportSelector;

        beforeEach(() => {
            multiplexer.push(selector);
            multiplexer.push(pointControl);
        });

        beforeEach(() => {
            priority = new ViewportSelector(viewport, editor);
            multiplexer.unshift(priority);
        })

        let startClick1: any, startClick2: any, startClick3: any;
        let endClick1: any, endClick2: any, endClick3: any;

        beforeEach(() => {
            startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(true);
            endClick1 = jest.spyOn(selector, 'endClick');

            startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            endClick2 = jest.spyOn(pointControl, 'endClick');

            startClick3 = jest.spyOn(priority, 'startClick').mockReturnValue(true);
            endClick3 = jest.spyOn(priority, 'endClick');
        })

        test('when the first control returns true', () => {
            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(0);
            expect(startClick2).toHaveBeenCalledTimes(0);
            expect(startClick3).toHaveBeenCalledTimes(1);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(0);
            expect(endClick2).toHaveBeenCalledTimes(0);
            expect(endClick3).toHaveBeenCalledTimes(1);
        });

        test('remove goes back to normal', () => {
            multiplexer.delete(priority);

            multiplexer.startClick([], downEvent);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(0);
            expect(startClick3).toHaveBeenCalledTimes(0);

            multiplexer.endClick([], upEvent);
            expect(endClick1).toHaveBeenCalledTimes(1);
            expect(endClick2).toHaveBeenCalledTimes(0);
            expect(endClick3).toHaveBeenCalledTimes(0);
        })
    })
});