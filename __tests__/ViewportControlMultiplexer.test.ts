/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { Viewport } from "../src/components/viewport/Viewport";
import { ViewportControlMultiplexer } from "../src/components/viewport/ViewportControlMultiplexer";
import { ViewportPointControl } from "../src/components/viewport/ViewportPointControl";
import { Editor } from "../src/editor/Editor";
import { ViewportSelector } from "../src/selection/ViewportSelector";
import { MakeViewport } from "../__mocks__/FakeViewport";
import './matchers';

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
        multiplexer.add(selector);
        multiplexer.add(pointControl);
        multiplexer.remove(selector);
        multiplexer.remove(pointControl);
    });

    test('hover multiplexes', () => {
        multiplexer.add(selector);
        multiplexer.add(pointControl);

        const startHover1 = jest.spyOn(selector, 'startHover');
        const continueHover1 = jest.spyOn(selector, 'continueHover');
        const endHover1 = jest.spyOn(selector, 'endHover');

        const startHover2 = jest.spyOn(pointControl, 'startHover');
        const continueHover2 = jest.spyOn(pointControl, 'continueHover');
        const endHover2 = jest.spyOn(pointControl, 'endHover');

        multiplexer.startHover([]);
        expect(startHover1).toBeCalledTimes(1);
        expect(startHover2).toBeCalledTimes(1);

        multiplexer.continueHover([]);
        expect(continueHover1).toBeCalledTimes(1);
        expect(continueHover2).toBeCalledTimes(1);

        multiplexer.endHover();
        expect(endHover1).toBeCalledTimes(1);
        expect(endHover2).toBeCalledTimes(1);
    });
    
    describe('click picks a winner and delegates all subsequent commands', () => {
        beforeEach(() => {
            multiplexer.add(selector);
            multiplexer.add(pointControl);
        });

        test('when the first control returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(true);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([]);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(0);

            multiplexer.endClick([]);
            expect(endClick1).toHaveBeenCalledTimes(1);
            expect(endClick2).toHaveBeenCalledTimes(0);
        });

        test('when the second control returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(false);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(true);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([]);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(1);

            multiplexer.endClick([]);
            expect(endClick1).toHaveBeenCalledTimes(0);
            expect(endClick2).toHaveBeenCalledTimes(1);
        });

        test('when nobody returns true', () => {
            const startClick1 = jest.spyOn(selector, 'startClick').mockReturnValue(false);
            const endClick1 = jest.spyOn(selector, 'endClick');

            const startClick2 = jest.spyOn(pointControl, 'startClick').mockReturnValue(false);
            const endClick2 = jest.spyOn(pointControl, 'endClick');

            multiplexer.startClick([]);
            expect(startClick1).toHaveBeenCalledTimes(1);
            expect(startClick2).toHaveBeenCalledTimes(1);

            multiplexer.endClick([]);
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
    
                multiplexer.startClick([]);
                expect(startClick1).toHaveBeenCalledTimes(1);
                expect(startClick2).toHaveBeenCalledTimes(0);

                multiplexer.startDrag(new MouseEvent('down'), new THREE.Vector2());
                expect(startDrag1).toHaveBeenCalledTimes(1);
                expect(startDrag2).toHaveBeenCalledTimes(0);

                multiplexer.continueDrag(new MouseEvent('move'), new THREE.Vector2());
                expect(continueDrag1).toHaveBeenCalledTimes(1);
                expect(continueDrag2).toHaveBeenCalledTimes(0);

                multiplexer.endDrag(new THREE.Vector2());
                expect(endDrag1).toHaveBeenCalledTimes(1);
                expect(endDrag2).toHaveBeenCalledTimes(0);
            });
        });
    });
});