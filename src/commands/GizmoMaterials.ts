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

export interface GizmoMaterial {
    mesh: THREE.MeshBasicMaterial;
    line2: LineMaterial;
    line: THREE.LineBasicMaterial;
    transparent: THREE.MeshBasicMaterial;
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

    readonly red: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0xff0000
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0xff0000,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0xff0000,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0xff0000,
        }, depthInfo)),
    }

    readonly green: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0x00ff00
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0x00ff00,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0x00ff00,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0x00ff00,
            side: THREE.DoubleSide,
        }, depthInfo)),
    }

    readonly blue: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0x0000ff
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0x0000ff,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0x0000ff,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0x0000ff,
        }, depthInfo)),
    }

    readonly yellow: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0xffff00
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0xffff00,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0xffff00,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0xffff00,
        }, depthInfo)),
    }

    readonly white: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0xffffff
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0xffffff,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0xffffff,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0xffffff,
        }, depthInfo)),
    }

    readonly magenta: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0xff00ff
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0xff00ff,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0xff00ff,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0xff00ff,
        }, depthInfo)),
    }

    readonly cyan: GizmoMaterial = {
        mesh: new THREE.MeshBasicMaterial(Object.assign({
            color: 0x00ffff
        }, depthInfo)),
        line2: new LineMaterial(Object.assign({
            color: 0x00ffff,
            linewidth: 3,
        }, depthInfo)),
        line: new THREE.LineBasicMaterial({
            color: 0x00ffff,
        }),
        transparent: new THREE.MeshBasicMaterial(Object.assign({
            opacity: 0.25,
            color: 0x00ffff,
        }, depthInfo)),
    }

    private readonly lines = [this.white.line2, this.red.line2, this.green.line2, this.blue.line2, this.yellow.line2];

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({resolution}) => this.setResolution(resolution));
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