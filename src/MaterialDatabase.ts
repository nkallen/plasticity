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
        const lineMaterial = new LineMaterial({ color: 0x000000, linewidth: 1.2 });
        this.lineMaterials.set(hash("line"), lineMaterial);

        const lineMaterial_dashed = new LineMaterial({ color: 0x000000, linewidth: 0.8, dashed: true, dashScale: 100 });
        lineMaterial_dashed.depthFunc = THREE.AlwaysDepth;
        lineMaterial_dashed.defines.USE_DASH = "";
        lineMaterial_dashed.dashSize = 1;
        lineMaterial_dashed.gapSize = 1;
        this.lineMaterials.set(hash("line-dashed"), lineMaterial_dashed);

        const lineMaterial_highlighted = new LineMaterial({ color: 0xffff00, linewidth: 2 });
        lineMaterial_highlighted.depthFunc = THREE.AlwaysDepth;
        this.lineMaterials.set(hash("line-highlighted"), lineMaterial_highlighted);

        const lineMaterial_hovered = new LineMaterial({ color: 0xffffff, linewidth: 2 });
        lineMaterial_hovered.depthFunc = THREE.AlwaysDepth;
        this.lineMaterials.set(hash("line-hovered"), lineMaterial_hovered);
        this.materials.set(hash("point"), new THREE.PointsMaterial({ color: 0x888888 }));

        const material = new THREE.MeshMatcapMaterial();
        material.fog = false;
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

    private getLine(l: c3d.SpaceInstance): LineMaterial | undefined {
        const st = l.GetStyle();
        return this.lineMaterials.get(st);
    }

    line(o?: c3d.SpaceInstance): LineMaterial {
        if (!o) return this.lineMaterials.get(hash("line"));
        else return this.getLine(o) ?? this.lineMaterials.get(hash("line"));
    }

    lineDashed(): LineMaterial {
        return this.lineMaterials.get(hash("line-dashed"));
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
        // material = material.clone(); // FIXME need to dispose of this material
        material.side = doubleSided ? THREE.FrontSide : THREE.DoubleSide;
        return material;
    }

    highlight(o: c3d.TopologyItem | c3d.SpaceInstance): LineMaterial {
        return this.lineMaterials.get(hash("line-highlighted"));
    }

    // FIXME audit these methods
    lookup(o: c3d.TopologyItem): LineMaterial {
        return this.lineMaterials.get(hash("line"));
    }

    hover() {
        return this.lineMaterials.get(hash("line-hovered"));
    }
}