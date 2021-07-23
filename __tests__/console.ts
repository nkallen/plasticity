//@ts-ignore
global.console = {
    log: console.log,
    error: console.error,
    warn: jest.fn(),
    info: console.info,
    debug: console.debug,
    assert: console.assert,
    trace: console.trace,
    time: jest.fn(),
    timeEnd: jest.fn(),
};

import '../lib/c3d/enums'
import license from '../license-key.json';
import c3d from '../build/Release/c3d.node';

c3d.Enabler.EnableMathModules(license.name, license.key);
