//@ts-ignore
global.console = {
    log: console.log,
    error: console.error,
    warn: jest.fn(),
    info: jest.fn(),
    debug: console.debug,
    assert: (cond, ...args) => expect(cond).toBeTruthy(),
    trace: console.trace,
    time: jest.fn(),
    timeEnd: jest.fn(),
};

import '../lib/c3d/enums'
import license from '../license-key.json';
import c3d from '../build/Release/c3d.node';

c3d.Enabler.EnableMathModules(license.name, license.key);

jest.mock('three/examples/jsm/loaders/EXRLoader.js');

global.performance = {
    now: () => 0,
    mark: jest.fn(),
    measure: jest.fn(),
}

if (typeof navigator !== 'undefined') navigator.keyboard = {
getLayoutMap() {
        return Promise.resolve({
            get() { }
        });
    }
}