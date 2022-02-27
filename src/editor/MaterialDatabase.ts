import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../../build/Release/c3d.node';
import controlPointIcon from '../components/viewport/img/control-point.svg';
import { face_unhighlighted, region_unhighlighted } from "../visual_model/RenderedSceneBuilder";
import { BetterRaycastingPointsMaterial } from "../visual_model/VisualModelRaycasting";
import { EditorSignals } from "./EditorSignals";
import { MaterialMemento, MementoOriginator } from "./History";

export default interface MaterialDatabase extends MementoOriginator<MaterialMemento> {
    line(o?: c3d.SpaceInstance): LineMaterial;
    lineDashed(): LineMaterial;
    point(o?: c3d.Item): THREE.Material;
    surface(o?: c3d.Item): THREE.Material;
    region(): THREE.Material;
    controlPoint(): BetterRaycastingPointsMaterial;
    mesh(): THREE.Material;

    add(name: string, material: THREE.Material): number;
    get(id: number): THREE.Material;
}

const previewLine = new LineMaterial({ color: 0x000088, linewidth: 0.7 });

const line = new LineMaterial({ color: 0x000000, linewidth: 1.4 });

const line_dashed = new LineMaterial({ color: 0x000000, linewidth: 0.3, dashed: true, dashScale: 100, dashSize: 100, gapSize: 100 });
line_dashed.depthFunc = THREE.AlwaysDepth;
line_dashed.defines.USE_DASH = "";

const point = new BetterRaycastingPointsMaterial({ color: 0x888888 });

const surface = region_unhighlighted;

const mesh = face_unhighlighted;

const region = region_unhighlighted;

const controlPoint = new BetterRaycastingPointsMaterial({ map: new THREE.TextureLoader().load(controlPointIcon), size: 10, sizeAttenuation: false, vertexColors: true });

export class BasicMaterialDatabase implements MaterialDatabase, MementoOriginator<MaterialMemento> {
    private readonly materials = new Map<number, { name: string, material: THREE.Material }>();
    private readonly lines = [line, line_dashed, previewLine];
    private counter = 1; // start > 0 since GetStyle() returns 0 for undefined.

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
    }

    line(o?: c3d.SpaceInstance): LineMaterial {
        if (o === undefined) return line;
        if (o.GetStyle() === 0) return line;
        if (o.GetStyle() === 1) return previewLine;
        return line;
    }

    lineDashed(): LineMaterial {
        return line_dashed;
    }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    private setResolution(size: THREE.Vector2) {
        for (const material of this.lines) {
            material.resolution.copy(size);
        }
        controlPoint.resolution.copy(size);
    }

    point(o?: c3d.Item): THREE.Material {
        return point;
    }

    surface(o?: c3d.Item) {
        return surface;
    }

    mesh() {
        return mesh;
    }

    add(name: string, material: THREE.Material): number {
        const id = this.counter++;
        this.materials.set(id, { name, material });
        return id;
    }

    get(id: number): THREE.Material {
        return this.materials.get(id)!.material;
    }

    region(): THREE.Material { return region }
    controlPoint(): BetterRaycastingPointsMaterial { return controlPoint }

    saveToMemento(): MaterialMemento {
        // TODO: deep copy
        return new MaterialMemento(new Map(this.materials));
    }

    restoreFromMemento(m: MaterialMemento): void {
        (this.materials as BasicMaterialDatabase['materials']) = new Map(m.materials);
    }

    validate(): void { }
    debug(): void { }

}

export class CurvePreviewMaterialDatabase extends BasicMaterialDatabase {
    line(o?: c3d.SpaceInstance): LineMaterial {
        return previewLine;
    }
}