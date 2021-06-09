import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../build/Release/c3d.node';
import * as visual from '../src/VisualModel';
import { EditorSignals } from "./Editor";
import porcelain from './img/matcap-porcelain-white.jpg';
import { assertUnreachable } from "./util/Util";

function hash(str: string) {
    for (var i = 0, h = 9; i < str.length;)
        h = Math.imul(h ^ str.charCodeAt(i++), 9 ** 9);
    return h ^ h >>> 9
};

export default interface MaterialDatabase {
    line(o?: c3d.SpaceInstance): LineMaterial;
    lineDashed(): LineMaterial;
    setResolution(size: THREE.Vector2): void;
    point(o?: c3d.Item): THREE.Material;
    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material;
    region(o?: c3d.MeshBuffer): THREE.Material;

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;

    lookup(o: c3d.Edge): LineMaterial;
    lookup(o: c3d.Face): THREE.Material;
    lookup(o: c3d.TopologyItem): THREE.Material;

    hover(object: visual.Face): THREE.Material;
    hover(object: visual.Edge): LineMaterial;
    hover(object: visual.CurveSegment): LineMaterial;
}

const line = new LineMaterial({ color: 0x000000, linewidth: 1.2 });

const line_dashed = new LineMaterial({ color: 0x000000, linewidth: 0.8, dashed: true, dashScale: 100 });
line_dashed.depthFunc = THREE.AlwaysDepth;
line_dashed.defines.USE_DASH = "";
line_dashed.dashSize = 1;
line_dashed.gapSize = 1;

const line_highlighted = new LineMaterial({ color: 0xffff00, linewidth: 2 });
line_highlighted.depthFunc = THREE.AlwaysDepth;

const line_hovered = new LineMaterial({ color: 0xffffff, linewidth: 2 });
line_hovered.depthFunc = THREE.AlwaysDepth;

const point = new THREE.PointsMaterial({ color: 0x888888 });

const mesh = new THREE.MeshMatcapMaterial();
mesh.fog = false;
const matcapTexture = new THREE.TextureLoader().load(porcelain);
mesh.matcap = matcapTexture;
mesh.polygonOffset = true;
mesh.polygonOffsetFactor = 0.1;
mesh.polygonOffsetUnits = 1;

const mesh_highlighted = new THREE.MeshMatcapMaterial();
mesh_highlighted.color.setHex(0xffff00);
mesh_highlighted.fog = false;
mesh_highlighted.matcap = matcapTexture;
mesh_highlighted.polygonOffset = true;
mesh_highlighted.polygonOffsetFactor = 0.1;
mesh_highlighted.polygonOffsetUnits = 1;

const mesh_hovered = new THREE.MeshMatcapMaterial();
mesh_hovered.color.setHex(0xffffdd);
mesh_hovered.fog = false;
mesh_hovered.matcap = matcapTexture;
mesh_hovered.polygonOffset = true;
mesh_hovered.polygonOffsetFactor = 0.1;
mesh_hovered.polygonOffsetUnits = 1;

const region = new THREE.MeshBasicMaterial();
region.fog = false;
region.color.setHex(0x8dd9f2)
region.opacity = 0.1;
region.transparent = true;

export class BasicMaterialDatabase implements MaterialDatabase {
    readonly materials = new Map<number, THREE.Material>();
    private readonly lines = [line, line_dashed, line_highlighted, line_hovered];

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(([, resolution]) => this.setResolution(resolution));
    }

    private get(o: c3d.Item): THREE.Material | undefined {
        const st = o.GetStyle();
        return this.materials.get(st);
    }

    line(o?: c3d.SpaceInstance): LineMaterial {
        return line;
        // FIXME GetStyle errors on windows on unset object
        // if (!o) return line;
        // else return this.getLine(o) ?? line;
    }

    lineDashed(): LineMaterial {
        return line_dashed;
    }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.set(size.x, size.y);
        }
    }

    point(o?: c3d.Item): THREE.Material {
        if (!o) return point;
        return this.get(o) ?? point;
    }

    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material {
        let material;
        if (o instanceof c3d.Item) {
            material = this.get(o);
        } else if (o) {
            material = this.materials.get(o.style);
        }
        material = material ?? mesh;
        // material = material.clone(); // FIXME need to dispose of this material
        material.side = doubleSided ? THREE.FrontSide : THREE.DoubleSide;
        return material;
    }

    region(o: c3d.MeshBuffer): THREE.Material {
        return region;
    }

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;
    highlight(o: c3d.TopologyItem | c3d.Curve3D | c3d.SpaceInstance): THREE.Material {
        if (o instanceof c3d.Curve3D || o instanceof c3d.Edge)
            return line_highlighted;
        else if (o instanceof c3d.Face)
            return mesh_highlighted;
        else if (o instanceof c3d.SpaceInstance)
            return line_highlighted;
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
            return line;
        else if (o instanceof c3d.Face)
            return mesh;
        else if (o instanceof c3d.SpaceInstance)
            return line;
        else {
            throw new Error(`not yet implemented: ${o.constructor}`);
        }
    }

    hover(object: visual.Face): THREE.Material;
    hover(object: visual.Edge): LineMaterial;
    hover(object: visual.CurveSegment): LineMaterial;
    hover(object: visual.Face | visual.Edge | visual.CurveSegment): THREE.Material {
        if (object instanceof visual.Edge || object instanceof visual.CurveSegment) {
            return line_hovered;
        } else if (object instanceof visual.Face) {
            return mesh_hovered;
        }
        assertUnreachable(object);
    }
}