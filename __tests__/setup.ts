import '../src/types/c3d-enum'
import license from '../license-key.json';
import c3d from '../build/Release/c3d.node';

export default () => {
    c3d.Enabler.EnableMathModules(license.name, license.key);
}
