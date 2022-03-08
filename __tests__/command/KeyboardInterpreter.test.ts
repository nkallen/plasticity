/**
 * @jest-environment jsdom
 */
import { KeyboardInterpreter, TextCalculator } from "../../src/command/KeyboardInterpreter"

describe(KeyboardInterpreter, () => {
    let interpreter: KeyboardInterpreter;

    beforeEach(() => {
        interpreter = new KeyboardInterpreter();
    })

    test('0-9', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '0' }));
        expect(interpreter.state).toEqual('0');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        expect(interpreter.state).toEqual('01');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '2' }));
        expect(interpreter.state).toEqual('012');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '3' }));
        expect(interpreter.state).toEqual('0123');
    })

    test('dot', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '0' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '.' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        expect(interpreter.state).toEqual('0.1');
    })

    test('backspace', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '.' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(interpreter.state).toEqual('1.');
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(interpreter.state).toEqual('1');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '2' }));
        expect(interpreter.state).toEqual('12');
    })

    test('minus', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '-' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        expect(interpreter.state).toEqual('-1');
    })

    test('caret', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '-' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '2' }));
        expect(interpreter.state).toEqual('-21');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '3' }));
        expect(interpreter.state).toEqual('-231');
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '0' }));
        expect(interpreter.state).toEqual('-2310');
    })

    test('caret bounds left', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '2' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '3' }));
        expect(interpreter.state).toEqual('123');
    })

    test('caret bounds right', () => {
        expect(interpreter.state).toEqual('');
        interpreter.interpret(new KeyboardEvent('keydown', { key: '1' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '2' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '3' }));
        expect(interpreter.state).toEqual('123');
        interpreter.interpret(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        interpreter.interpret(new KeyboardEvent('keydown', { key: '4' }));
        expect(interpreter.state).toEqual('1243');
    })

})

describe(TextCalculator, () => {
    test("basic numbers", () => {
        expect(TextCalculator.calculate("123")).toBe(123);
        expect(TextCalculator.calculate("1.23")).toBe(1.23);
        expect(TextCalculator.calculate("-123")).toBe(-123);
        expect(TextCalculator.calculate("")).toBe(undefined);
    })

    test("invalid numbers", () => {
        expect(TextCalculator.calculate("1.2.3")).toBe(undefined);
        expect(TextCalculator.calculate("123a")).toBe(undefined);
        expect(TextCalculator.calculate("abc")).toBe(undefined);
    })

    test("dash -", () => {
        expect(TextCalculator.calculate("123")).toBe(123);
        expect(TextCalculator.calculate("-123")).toBe(-123);
        expect(TextCalculator.calculate("123-")).toBe(-123);
    })
})