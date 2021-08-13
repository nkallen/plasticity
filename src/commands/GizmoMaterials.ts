import { EditorSignals } from "../editor/EditorSignals";
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const depthInfo = {
    depthTest: true,
    depthWrite: true,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    transparent: true,
};

export interface Foo {
    mesh: THREE.MeshBasicMaterial;
    line2: LineMaterial;
    line: THREE.LineBasicMaterial;
}

export interface GizmoMaterial extends Foo {
    hover: Foo;
}

export class GizmoMaterialDatabase {
    readonly invisible = new THREE.MeshBasicMaterial(Object.assign({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.0,
    }, depthInfo));

    readonly occlude = new THREE.MeshBasicMaterial(Object.assign({
        depthWrite: true,
        transparent: true,
        opacity: 0,
    }, depthInfo));

    static make(color: number): GizmoMaterial {
        return {
            mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 0.25, color }, depthInfo)),
            line2: new LineMaterial(Object.assign({ color, opacity: 0.25, linewidth: 3, }, depthInfo)),
            line: new THREE.LineBasicMaterial({ opacity: 0.25, color, }),
            hover: {
                mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 0.7, color }, depthInfo)),
                line2: new LineMaterial(Object.assign({ color, opacity: 0.7, linewidth: 3, }, depthInfo)),
                line: new THREE.LineBasicMaterial({ opacity: 0.7, color, }),
            }
        }
    }

    readonly red: GizmoMaterial;
    readonly green: GizmoMaterial;
    readonly blue: GizmoMaterial;
    readonly yellow: GizmoMaterial;
    readonly white: GizmoMaterial;
    readonly magenta: GizmoMaterial;
    readonly cyan: GizmoMaterial;
    private readonly lines: LineMaterial[];

    constructor(signals: EditorSignals) {
        this.red = GizmoMaterialDatabase.make(0xff0000);
        this.green = GizmoMaterialDatabase.make(0x00ff00);
        this.blue = GizmoMaterialDatabase.make(0x0000ff);
        this.white = GizmoMaterialDatabase.make(0xffffff);

        this.yellow = GizmoMaterialDatabase.make(0xffff00);
        this.cyan = GizmoMaterialDatabase.make(0x00ffff);
        this.magenta = GizmoMaterialDatabase.make(0xff00ff);

        this.lines = [
            this.white.line2, this.red.line2, this.green.line2, this.blue.line2, this.yellow.line2,
            this.white.hover.line2, this.red.hover.line2, this.green.hover.line2, this.blue.hover.line2, this.yellow.hover.line2
        ];
        
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