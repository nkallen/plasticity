import { EditorSignals } from "../editor/EditorSignals";
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const depthInfo = {
    depthTest: true,
    depthWrite: true,
    fog: false,
    toneMapped: false,
    transparent: true,
};

export interface ActiveGizmoMaterial {
    mesh: THREE.MeshBasicMaterial;
    line2: LineMaterial;
    line: THREE.LineBasicMaterial;
}

export interface GizmoMaterial extends ActiveGizmoMaterial {
    hover: ActiveGizmoMaterial;
}

export class GizmoMaterialDatabase {
    readonly invisible = new THREE.MeshBasicMaterial(Object.assign({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.0,
        side: THREE.DoubleSide,
    }, depthInfo));

    readonly occlude = new THREE.MeshBasicMaterial(Object.assign({
        depthWrite: true,
        transparent: true,
        opacity: 0,
    }, depthInfo));

    static make(num: number, side = THREE.FrontSide): GizmoMaterial {
        const color = new THREE.Color(num);
        const normalColor = color.offsetHSL(0, -0.2, 0);
        const hoverColor = color.offsetHSL(0, 0, 0);
        const a = normalColor.getHex();
        const b = hoverColor.getHex();
        return {
            mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 0.75, color: a }, depthInfo, { side })),
            line2: new LineMaterial(Object.assign({ color: a, opacity: 1, linewidth: 3, }, depthInfo, { side })),
            line: new THREE.LineBasicMaterial({ opacity: 0.75, color: a, }),
            hover: {
                mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 1, color: b }, depthInfo, { side })),
                line2: new LineMaterial(Object.assign({ color: b, opacity: 1, linewidth: 3, }, depthInfo, { side })),
                line: new THREE.LineBasicMaterial({ opacity: 1, color: b, }),
            }
        }
    }

    readonly default = GizmoMaterialDatabase.make(0xffff00);
    readonly red = GizmoMaterialDatabase.make(0xff0000);
    readonly black = GizmoMaterialDatabase.make(0x0);
    readonly darkGray = GizmoMaterialDatabase.make(0x010101);
    readonly green = GizmoMaterialDatabase.make(0x00ff00);
    readonly blue = GizmoMaterialDatabase.make(0x0000ff);
    readonly yellow = GizmoMaterialDatabase.make(0xffff00, THREE.DoubleSide);
    readonly white = GizmoMaterialDatabase.make(0xffffff);
    readonly magenta = GizmoMaterialDatabase.make(0xff00ff, THREE.DoubleSide)
    readonly cyan = GizmoMaterialDatabase.make(0x00ffff, THREE.DoubleSide);
    private readonly lines = [
        this.white.line2, this.red.line2, this.green.line2, this.blue.line2, this.yellow.line2, this.default.line2, this.black.line2, this.darkGray.line2,
        this.white.hover.line2, this.red.hover.line2, this.green.hover.line2, this.blue.hover.line2, this.yellow.hover.line2, this.default.hover.line2, this.black.hover.line2, this.darkGray.hover.line2,
    ];

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
    }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    setResolution(size: THREE.Vector2): void {
        const width = size.x, height = size.y;
        for (const material of this.lines) {
            material.resolution.set(width, height);
        }
    }
}