import * as THREE from "three";
import { assertUnreachable } from "../util/Util";
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from "./EditorSignals";
import { EmptyMemento, MementoOriginator } from "./History";
import { Images } from "./Images";
import { EmptyJSON } from "./PlasticityDocument";

export type EmptyId = number;

export type EmptyInfo = { tag: 'Image', path: string }

export abstract class Empty extends visual.SpaceItem {
    constructor(readonly simpleName: EmptyId) {
        super();
        this.layers.set(visual.Layers.Empty);
    }
}

export class ImageEmpty extends Empty {
    readonly plane: THREE.Mesh;

    constructor(simpleName: EmptyId, texture: THREE.Texture) {
        super(simpleName);
        const aspect = texture.image.width / texture.image.height;
        const fac = 5;
        const geometry = new THREE.PlaneGeometry(fac * aspect, fac, 1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        this.plane = new THREE.Mesh(geometry, material);
        this.add(this.plane);
    }

    get outline(): THREE.Object3D | undefined {
        if (!this.visible) return undefined;
        return this;
    }

    dispose() {
        const material = this.plane.material as THREE.MeshLambertMaterial;
        material.dispose();
        material.map!.dispose();
    }
}

export class Empties implements MementoOriginator<EmptyMemento>{
    private counter: EmptyId = 0;
    private readonly id2info = new Map<EmptyId, Readonly<EmptyInfo>>();
    private readonly id2empty = new Map<EmptyId, Empty>();

    constructor(
        private readonly images: Images,
        private readonly signals: EditorSignals
    ) { }

    addImage(filePath: string): ImageEmpty {
        const id = this.counter++;
        const info = { tag: 'Image', path: filePath } as EmptyInfo;
        const texture = this.images.get(filePath);
        if (texture === undefined) throw new Error("invalid precondition: " + filePath);
        const empty = new ImageEmpty(id, texture);
        this.id2empty.set(id, empty);
        this.id2info.set(id, info);
        this.signals.emptyAdded.dispatch(empty);
        return empty;
    }

    delete(empty: Empty) {
        const id = empty.simpleName;
        this.id2empty.delete(id);
        this.id2info.delete(id);
        this.signals.emptyRemoved.dispatch(empty);
    }

    lookupById(id: EmptyId): Empty {
        return this.id2empty.get(id)!;
    }

    get items(): Empty[] {
        return [...this.id2empty.values()];
    }

    removeItem(empty: Empty) {
        this.id2info.delete(empty.simpleName);
        this.id2empty.delete(empty.simpleName);
        empty.dispose();
    }

    saveToMemento(): EmptyMemento {
        return new EmptyMemento(
            new Map(this.id2info),
            new Map(this.id2empty),
        );
    }

    restoreFromMemento(m: EmptyMemento) {
        (this.id2info as Empties['id2info']) = new Map(m.id2info);
        (this.id2empty as Empties['id2empty']) = new Map(m.id2empty);
    }

    async deserialize(jsons: EmptyJSON[]) {
        for (const json of jsons) {
            switch (json.type) {
                case 'Image':
                    this.addImage(json.image!);
                    break;
                default: assertUnreachable(json.type);
            }
        }
    }

    validate() { }
    debug() { }
}
