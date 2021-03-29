import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import porcelain from './img/matcap-porcelain-white.jpg';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

function hash(str: string) {
    for (var i = 0, h = 9; i < str.length;)
        h = Math.imul(h ^ str.charCodeAt(i++), 9 ** 9);
    return h ^ h >>> 9
};

export default class MaterialDatabase {
    private readonly materials = new Map<number, THREE.Material>();
    private readonly lineMaterials = new Map<number, LineMaterial>();

    constructor() {
        this.lineMaterials.set(hash("line"), new LineMaterial({ color: 0x000000, linewidth: 4 }));
        this.materials.set(hash("point"), new THREE.PointsMaterial({ color: 0x888888 }));

        const material = new THREE.MeshMatcapMaterial();
        const matcapTexture = new THREE.TextureLoader().load(porcelain);
        material.matcap = matcapTexture;
        material.polygonOffset = true;
        material.polygonOffsetFactor = 0.1;
        material.polygonOffsetUnits = 1;
        this.materials.set(hash("mesh"), material);
    }

    get(o: c3d.Item): THREE.Material | undefined {
        const st = o.GetStyle();
        return this.materials.get(st);
    }

    getLine(l: c3d.SpaceInstance): LineMaterial | undefined {
        const st = l.GetStyle();
        return this.lineMaterials.get(st);
    }

    line(o?: c3d.SpaceInstance): LineMaterial {
        if (!o) return this.lineMaterials.get(hash("line"));
        else return this.getLine(o) ?? this.lineMaterials.get(hash("line"));
    }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    setResolution(width: number, height: number) {
        for (const material of this.lineMaterials.values()) {
            material.resolution.set(width, height);
        }
    }

    point(o?: c3d.Item): THREE.Material {
        if (!o) return this.materials.get(hash("point"));
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