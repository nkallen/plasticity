
import '../matchers';
import { Interval } from '../../src/commands/curve/Interval';

describe(Interval, () => {
    describe('trim open', () => {
        const i = new Interval(5, 10, false);

        test('when the trim is bigger than the interval', () => {
            expect(i.trim(5, 10)).toEqual([]);
            expect(i.trim(0, 20)).toEqual([]);
        })

        test('when the trim is left of the interval', () => {
            expect(i.trim(4, 6)).toEqual([new Interval(6, 10)]);
        })

        test('when the trim is right of the interval', () => {
            expect(i.trim(9, 11)).toEqual([new Interval(5, 9)]);
        })

        test('when the trim is inside of the interval', () => {
            expect(i.trim(6, 9)).toEqual([new Interval(5, 6), new Interval(9, 10)]);
        })

        test('when the trim is outside of the interval', () => {
            expect(i.trim(11, 12)).toEqual([new Interval(5, 10)]);
            expect(i.trim(1, 2)).toEqual([new Interval(5, 10)]);
        })

        test('when the trim is hits a border of the interval', () => {
            expect(i.trim(9, 10)).toEqual([new Interval(5, 9)]);
            expect(i.trim(5, 6)).toEqual([new Interval(6, 10)]);
        })
    })

    describe('trim cyclic', () => {
        const i = new Interval(5, 10, true);

        test('when the trim is bigger than the interval', () => {
            expect(i.trim(5, 10)).toEqual([]);
            expect(i.trim(0, 20)).toEqual([]);
        })

        test('when the trim is left of the interval', () => {
            expect(i.trim(4, 6)).toEqual([new Interval(6, 9)]);
        })

        test('when the trim is right of the interval', () => {
            expect(i.trim(9, 11)).toEqual([new Interval(6, 9)]);
        })

        test('when the trim is inside of the interval', () => {
            expect(i.trim(6, 9)).toEqual([new Interval(9, 6)]);
        })
    })

    describe('multitrim', () => {
        const i = new Interval(5, 10);

        test('when the trim is bigger than the interval', () => {
            expect(i.multitrim([[6, 7]])).toEqual([new Interval(5, 6), new Interval(7, 10)]);
            expect(i.multitrim([[6, 7], [8, 9]])).toEqual([new Interval(7, 8), new Interval(9, 10), new Interval(5, 6)]);
            expect(i.multitrim([[6, 7], [7, 8]])).toEqual([new Interval(8, 10), new Interval(5, 6)]);
            expect(i.multitrim([[6, 7], [1, 20]])).toEqual([]);
            expect(i.multitrim([[6, 7], [7, 20]])).toEqual([new Interval(5, 6)]);
        })
    })
})