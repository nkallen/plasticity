import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../build/Release/c3d.node';
import * as visual from '../src/VisualModel';
import { EditorSignals } from "./Editor";
import porcelain from './img/matcap-porcelain-white.jpg';
import { assertUnreachable } from "./Util";

function hash(str: string) {
    for (var i = 0, h = 9; i < str.length;)
        h = Math.imul(h ^ str.charCodeAt(i++), 9 ** 9);
    return h ^ h >>> 9
};

export default interface MaterialDatabase {
    get(o: c3d.Item): THREE.Material | undefined;
    line(o?: c3d.SpaceInstance): LineMaterial;
    lineDashed(): LineMaterial;
    setResolution(size: THREE.Vector2): void;
    point(o?: c3d.Item): THREE.Material;
    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material;

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;

    lookup(o: c3d.TopologyItem): LineMaterial;

    hover(object: visual.Face): THREE.Material;
    hover(object: visual.Edge): LineMaterial;
    hover(object: visual.CurveSegment): LineMaterial;
}

export class BasicMaterialDatabase implements MaterialDatabase {
    readonly materials = new Map<number, THREE.Material>();
    private readonly lineMaterials = new Map<number, LineMaterial>();

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(([, resolution]) => this.setResolution(resolution));

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

        const meshMaterial = new THREE.MeshMatcapMaterial();
        meshMaterial.fog = false;
        const matcapTexture = new THREE.TextureLoader().load(porcelain);
        meshMaterial.matcap = matcapTexture;
        meshMaterial.polygonOffset = true;
        meshMaterial.polygonOffsetFactor = 0.1;
        meshMaterial.polygonOffsetUnits = 1;
        this.materials.set(hash("mesh"), meshMaterial);

        const meshMaterial_highlighted = new THREE.MeshMatcapMaterial();
        meshMaterial_highlighted.color.setHex(0xffff00);
        meshMaterial_highlighted.fog = false;
        meshMaterial_highlighted.matcap = matcapTexture;
        meshMaterial_highlighted.polygonOffset = true;
        meshMaterial_highlighted.polygonOffsetFactor = 0.1;
        meshMaterial_highlighted.polygonOffsetUnits = 1;
        this.materials.set(hash("mesh-highlighted"), meshMaterial_highlighted);

        const meshMaterial_hovered = new THREE.MeshMatcapMaterial();
        meshMaterial_hovered.color.setHex(0xffffdd);
        meshMaterial_hovered.fog = false;
        meshMaterial_hovered.matcap = matcapTexture;
        meshMaterial_hovered.polygonOffset = true;
        meshMaterial_hovered.polygonOffsetFactor = 0.1;
        meshMaterial_hovered.polygonOffsetUnits = 1;
        this.materials.set(hash("mesh-hovered"), meshMaterial_hovered);
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
    setResolution(size: THREE.Vector2) {
        const width = size.x, height = size.y;
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


    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;
    highlight(o: c3d.TopologyItem | c3d.Curve3D | c3d.SpaceInstance): THREE.Material {
        if (o instanceof c3d.Curve3D || o instanceof c3d.Edge)
            return this.lineMaterials.get(hash("line-highlighted"));
        else if (o instanceof c3d.Face)
            return this.materials.get(hash("mesh-highlighted"));
        else if (o instanceof c3d.SpaceInstance)
            return this.lineMaterials.get(hash("line-highlighted"));
        else {
            throw new Error(`not yet implemented: ${o.constructor}`);
        }
    }

    lookup(o: c3d.Edge): LineMaterial;
    lookup(o: c3d.Curve3D): LineMaterial;
    lookup(o: c3d.Face): THREE.Material;
    lookup(o: c3d.SpaceInstance): LineMaterial;
    lookup(o: c3d.TopologyItem | c3d.Curve3D | c3d.SpaceInstance): THREE.Material {
        if (o instanceof c3d.Curve3D || o instanceof c3d.Edge)
            return this.lineMaterials.get(hash("line"));
        else if (o instanceof c3d.Face)
            return this.materials.get(hash("mesh"));
        else if (o instanceof c3d.SpaceInstance)
            return this.lineMaterials.get(hash("line"));
        else {
            throw new Error(`not yet implemented: ${o.constructor}`);
        }
    }

    hover(object: visual.Face): THREE.Material;
    hover(object: visual.Edge): LineMaterial;
    hover(object: visual.CurveSegment): LineMaterial;
    hover(object: visual.Face | visual.Edge | visual.CurveSegment): THREE.Material {
        if (object instanceof visual.Edge || object instanceof visual.CurveSegment) {
            return this.lineMaterials.get(hash("line-hovered"));
        } else if (object instanceof visual.Face) {
            return this.materials.get(hash("mesh-hovered"));
        }
        assertUnreachable(object);
    }
}