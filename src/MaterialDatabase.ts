import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import porcelain from './img/matcap-porcelain-white.jpg';

function hash(str: string) {
    for (var i = 0, h = 9; i < str.length;)
        h = Math.imul(h ^ str.charCodeAt(i++), 9 ** 9);
    return h ^ h >>> 9
};

export default class MaterialDatabase {
    materials = new Map<number, THREE.Material>();

    constructor() {
        this.materials.set(hash("line"), new THREE.LineBasicMaterial({ color: 0xff0000 }));
        this.materials.set(hash("point"), new THREE.PointsMaterial({ color: 0x888888 }));

        const material = new THREE.MeshMatcapMaterial();
        const matcapTexture = new THREE.TextureLoader().load(porcelain);
        material.matcap = matcapTexture;
        this.materials.set(hash("mesh"), material);
    }

    get(o: c3d.Item): THREE.Material | undefined {
        const st = o.GetStyle();
        return this.materials.get(st);
    }

    line(o?: c3d.Item): THREE.Material {
        return this.get(o) ?? this.materials.get(hash("line"));
    }

    point(o?: c3d.Item): THREE.Material {
        return this.get(o) ?? this.materials.get(hash("point"));

    }

    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material {
        let material: THREE.Material;
        if (o instanceof c3d.Item) {
            material = this.get(o);
        } else if (o) {
            material = this.materials.get(o.style);
        }
        material = material ?? this.materials.get(hash("mesh"));
        material = material.clone();
        material.side = doubleSided ? THREE.FrontSide : THREE.DoubleSide;
        return material;
    }
}