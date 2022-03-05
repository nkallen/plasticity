/**
 * @jest-environment jsdom
 */
import { KeyboardInterpreter } from "../../src/command/KeyboardInterpreter"

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