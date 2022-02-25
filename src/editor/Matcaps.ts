import { DataTexture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

import ceramic_dark from '../img/matcap/ceramic_dark.exr';
import metal_carpaint from '../img/matcap/metal_carpaint.exr';
import reflection_check_horizontal from '../img/matcap/reflection_check_horizontal.exr';
import reflection_check_vertical from '../img/matcap/reflection_check_vertical.exr';

export type MatcapName = 'ceramic-dark' | 'metal-carpaint' | 'reflection-check-horizontal' | 'reflection-check-vertical';

class MatcapDatabase {
    private _ceramicDark!: DataTexture;
    get ceramicDark() {
        if (this._ceramicDark === undefined) this._ceramicDark = new EXRLoader().load(ceramic_dark, () => { });
        return this._ceramicDark;
    }

    private _metalCarpaint!: DataTexture;
    get metalCarpaint() {
        if (this._metalCarpaint === undefined) this._metalCarpaint = new EXRLoader().load(metal_carpaint, () => { });
        return this._metalCarpaint;
    }

    private _reflectionCheckHorizontal!: DataTexture;
    get reflectionCheckHorizontal() {
        if (this._reflectionCheckHorizontal === undefined) this._reflectionCheckHorizontal = new EXRLoader().load(reflection_check_horizontal, () => { });
        return this._reflectionCheckHorizontal;
    }


    private _reflectionCheckVertical!: DataTexture;
    get reflectionCheckVertical() {
        if (this._reflectionCheckVertical === undefined) this._reflectionCheckVertical = new EXRLoader().load(reflection_check_vertical, () => { });
        return this._reflectionCheckVertical;
    }

    get(name: MatcapName): DataTexture {
        switch (name) {
            case 'ceramic-dark': return this.ceramicDark;
            case 'metal-carpaint': return this.metalCarpaint;
            case 'reflection-check-horizontal': return this.reflectionCheckHorizontal;
            case 'reflection-check-vertical': return this.reflectionCheckVertical;
        }
    }
}

export const matcaps = new MatcapDatabase();