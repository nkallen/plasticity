import * as THREE from 'three';
import { Images } from '../src/editor/Images';

export class FakeImages extends Images {
    async add(filePath: string, data: Buffer): Promise<THREE.Texture> {
        return new THREE.Texture();
    }
    get(filePath: string): THREE.Texture {
        const img = jest.fn();
        return new THREE.Texture(img);
    }
    clear(): void {
    }
    get paths(): IterableIterator<string> {
        throw new Error('Method not implemented.');
    }
}