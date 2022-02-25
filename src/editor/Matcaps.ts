import { DataTexture } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

import ceramic_dark from '../img/matcap/ceramic_dark.exr';
import metal_carpaint from '../img/matcap/metal_carpaint.exr';
import reflection_check_horizontal from '../img/matcap/reflection_check_horizontal.exr';
import reflection_check_vertical from '../img/matcap/reflection_check_vertical.exr';
import { Delay } from '../util/SequentialExecutor';

export type MatcapName = 'ceramic-dark' | 'metal-carpaint' | 'reflection-check-horizontal' | 'reflection-check-vertical';

class MatcapDatabase {
    private _ceramicDark!: DataTexture;
    get ceramicDark() {
        const loaded = new Delay<void>();
        if (this._ceramicDark === undefined)
            this._ceramicDark = new EXRLoader().load(ceramic_dark, d => loaded.resolve());
        else loaded.resolve();
        return { texture: this._ceramicDark, loaded: loaded.promise };
    }

    private _metalCarpaint!: DataTexture;
    get metalCarpaint() {
        const loaded = new Delay<void>();
        if (this._metalCarpaint === undefined)
            this._metalCarpaint = new EXRLoader().load(metal_carpaint, () => loaded.resolve());
        else loaded.resolve();
        return { texture: this._metalCarpaint, loaded: loaded.promise };
    }

    private _reflectionCheckHorizontal!: DataTexture;
    get reflectionCheckHorizontal() {
        const loaded = new Delay<void>();
        if (this._reflectionCheckHorizontal === undefined)
            this._reflectionCheckHorizontal = new EXRLoader().load(reflection_check_horizontal, () => loaded.resolve());
        else loaded.resolve();
        return { texture: this._reflectionCheckHorizontal, loaded: loaded.promise };
    }


    private _reflectionCheckVertical!: DataTexture;
    get reflectionCheckVertical() {
        const loaded = new Delay<void>();
        if (this._reflectionCheckVertical === undefined)
            this._reflectionCheckVertical = new EXRLoader().load(reflection_check_vertical, () => loaded.resolve());
        else loaded.resolve();
        return { texture: this._reflectionCheckVertical, loaded: loaded.promise };
    }

    get(name: MatcapName) {
        switch (name) {
            case 'ceramic-dark': return this.ceramicDark;
            case 'metal-carpaint': return this.metalCarpaint;
            case 'reflection-check-horizontal': return this.reflectionCheckHorizontal;
            case 'reflection-check-vertical': return this.reflectionCheckVertical;
        }
    }
}

export const matcaps = new MatcapDatabase();