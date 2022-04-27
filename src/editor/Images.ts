import * as THREE from "three";
import { Delay } from "../util/SequentialExecutor";

export class Images {
    private readonly path2texture = new Map<string, THREE.Texture>();

    async add(filePath: string, data: Buffer): Promise<THREE.Texture> {
        const delay = new Delay<THREE.Texture>();
        const manager = new THREE.LoadingManager();
        const objectURLs: string[] = [];
        const blob = new Blob([data]);
        manager.setURLModifier(url => {
            url = URL.createObjectURL(blob);
            objectURLs.push(url);
            return url;
        });
        new THREE.TextureLoader(manager).load(filePath, texture => {
            for (const url of objectURLs)
                URL.revokeObjectURL(url);
            delay.resolve(texture);
        });
        const texture = await delay.promise;
        texture.encoding = THREE.sRGBEncoding;
        this.path2texture.set(filePath, texture);
        return texture;
    }

    get(filePath: string): THREE.Texture | undefined {
        return this.path2texture.get(filePath);
    }

    clear() {
        this.path2texture.clear();
    }

    get paths() {
        return this.path2texture.keys();
    }
}
