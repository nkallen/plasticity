import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

import ceramic_dark from '../img/matcap/ceramic_dark.exr';
import metal_carpaint from '../img/matcap/metal_carpaint.exr';
import reflection_check_horizontal from '../img/matcap/reflection_check_horizontal.exr';
import reflection_check_vertical from '../img/matcap/reflection_check_vertical.exr';

export const ceramicDark = new EXRLoader().load(ceramic_dark, () => { });
export const metalCarpaint = new EXRLoader().load(metal_carpaint, () => { });
export const reflectionCheckHorizontal = new EXRLoader().load(reflection_check_horizontal, () => { });
export const reflectionCheckVertical = new EXRLoader().load(reflection_check_vertical, () => { });
