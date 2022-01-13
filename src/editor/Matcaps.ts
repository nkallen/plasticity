import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import matcap from '../img/matcap/ceramic_dark.exr';


export const matcapTexture = new EXRLoader().load(matcap, () => { });
