import * as THREE from "three";
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Delay } from '../util/SequentialExecutor';

export class TextureLoader {
    private readonly map = new Map<string, { texture: THREE.DataTexture; loaded: Promise<THREE.Texture>; }>();

    get(filename: string): { texture: THREE.DataTexture; loaded: Promise<THREE.Texture>; } {
        if (!this.map.has(filename)) {
            const loaded = new Delay<THREE.Texture>();
            const texture = new EXRLoader().load(filename, texture => {
                loaded.resolve(texture);
            });
            this.map.set(filename, { texture, loaded: loaded.promise });
        }
        return this.map.get(filename)!;
    }
}
