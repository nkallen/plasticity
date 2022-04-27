import * as THREE from "three";
import { Delay } from "../util/SequentialExecutor";
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { ConstructionPlane } from "./snaps/ConstructionPlaneSnap";
import buffer from 'buffer';

export type EmptyId = number;

export type EmptyInfo = { tag: 'Image', transform: Transform, path: string }
export type Transform = { position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 }

export abstract class Empty extends visual.SpaceItem {
    constructor(readonly simpleName: EmptyId) {
        super();
    }
}


export class ImageEmpty extends Empty {
    private readonly mesh: THREE.Mesh;

    constructor(simpleName: EmptyId, texture: THREE.Texture) {
        super(simpleName);
        const aspect = texture.image.width / texture.image.height;
        const geometry = new THREE.PlaneGeometry(aspect, 1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        this.mesh = new THREE.Mesh(geometry, material);
        this.add(this.mesh);
    }

    dispose() {
        const material = this.mesh.material as THREE.MeshLambertMaterial;
        material.dispose();
        material.map!.dispose();
    }
}

export class Empties {
    private counter: EmptyId = 0;
    private readonly id2info = new Map<EmptyId, EmptyInfo>();
    private readonly id2empty = new Map<EmptyId, Empty>();

    constructor(private readonly signals: EditorSignals) { }

    async addImage(filePath: string, data: Buffer, cplane: ConstructionPlane) {
        const id = this.counter++;
        const transform = { position: new THREE.Vector3(), quaternion: cplane.orientation.clone(), scale: new THREE.Vector3() };
        const info = { tag: 'Image', path: filePath, transform } as EmptyInfo;

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
        const empty = new ImageEmpty(id, texture);
        this.id2empty.set(id, empty);
        this.id2info.set(id, info);
        this.signals.emptyAdded.dispatch(empty);
    }

    lookupById(id: EmptyId): Empty {
        return this.id2empty.get(id)!;
    }
}