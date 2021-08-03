import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../../build/Release/c3d.node';
import controlPointIcon from '../components/viewport/img/control-point.svg';
import porcelain from '../img/matcap-porcelain-white.jpg';
import { EditorSignals } from "./EditorSignals";

export default interface MaterialDatabase {
    line(o?: c3d.SpaceInstance): LineMaterial;
    lineDashed(): LineMaterial;
    setResolution(size: THREE.Vector2): void;
    point(o?: c3d.Item): THREE.Material;
    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material;
    region(): THREE.Material;
    controlPoint(): THREE.PointsMaterial;

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.SpaceInstance): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.PlaneInstance): THREE.Material;
    highlight(o: c3d.TopologyItem): THREE.Material;
    highlight(o: number): THREE.Color;
    highlight(o: c3d.Item): THREE.Material;

    lookup(o: c3d.Edge): LineMaterial;
    lookup(o: c3d.Face): THREE.Material;
    lookup(o: c3d.Edge | c3d.Face): THREE.Material;

    hover(o: c3d.Edge): LineMaterial;
    hover(o: c3d.Curve3D): LineMaterial;
    hover(o: c3d.SpaceInstance): LineMaterial;
    hover(o: c3d.Face): THREE.Material;
    hover(o: c3d.PlaneInstance): THREE.Material;
    hover(o: c3d.TopologyItem): THREE.Material;
    hover(o: number): THREE.Color;
    hover(o: c3d.Item): THREE.Material;
}

const line = new LineMaterial({ color: 0x000000, linewidth: 1.5 });

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

const region_hovered = new THREE.MeshBasicMaterial();
region_hovered.fog = false;
region_hovered.color.setHex(0x8dd9f2)
region_hovered.opacity = 0.5;
region_hovered.transparent = true;

const region_highlighted = new THREE.MeshBasicMaterial();
region_highlighted.fog = false;
region_highlighted.color.setHex(0x8dd9f2)
region_highlighted.opacity = 0.9;
region_highlighted.transparent = true;

const controlPoint = new THREE.PointsMaterial({ map: new THREE.TextureLoader().load(controlPointIcon), size: 10, sizeAttenuation: false, transparent: true, vertexColors: true });
controlPoint.userData.resolution = new THREE.Vector2();

const controlPoint_hovered = new THREE.Color(0xffff88);
const controlPoint_highlighted = new THREE.Color(0xffff00);

export class BasicMaterialDatabase implements MaterialDatabase {
    readonly materials = new Map<number, THREE.Material>();
    private readonly lines = [line, line_dashed, line_highlighted, line_hovered];

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
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
            material.resolution.copy(size);
        }
        controlPoint.userData.resolution.copy(size);
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

    region(): THREE.Material { return region }
    controlPoint(): THREE.PointsMaterial { return controlPoint }

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.PlaneInstance): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;
    highlight(o: number): THREE.Color;
    highlight(o: any): THREE.Material | THREE.Color {
        if (o instanceof c3d.Curve3D || o instanceof c3d.Edge)
            return line_highlighted;
        else if (o instanceof c3d.Face)
            return mesh_highlighted;
        else if (o instanceof c3d.SpaceInstance)
            return line_highlighted;
        else if (o instanceof c3d.PlaneInstance)
            return region_highlighted;
        else if (typeof (o) === 'number')
            return controlPoint_highlighted;
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

    hover(o: c3d.Edge): LineMaterial;
    hover(o: c3d.Curve3D): LineMaterial;
    hover(o: c3d.SpaceInstance): LineMaterial;
    hover(o: c3d.Face): THREE.Material;
    hover(o: c3d.PlaneInstance): THREE.Material;
    hover(o: c3d.TopologyItem): THREE.Material;
    hover(o: c3d.Item): THREE.Material;
    hover(o: number): THREE.Color;
    hover(o: any): THREE.Material | THREE.Color {
        if (o instanceof c3d.Curve3D || o instanceof c3d.Edge)
            return line_hovered;
        else if (o instanceof c3d.Face)
            return mesh_hovered;
        else if (o instanceof c3d.SpaceInstance)
            return line_hovered;
        else if (o instanceof c3d.PlaneInstance)
            return region_hovered;
        else if (typeof (o) === 'number')
            return controlPoint_hovered
        else {
            throw new Error(`not yet implemented: ${o.constructor}`);
        }
    }
}
