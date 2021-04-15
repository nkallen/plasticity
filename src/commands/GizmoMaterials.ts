import { EditorSignals } from "../Editor";
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

export class GizmoMaterialDatabase {
    readonly invisible = new THREE.MeshBasicMaterial(Object.assign({
        transparent: true,
        opacity: 0.15
    }, depthInfo));

    readonly occlude = new THREE.MeshBasicMaterial(Object.assign({
        depthWrite: true,
        transparent: true,
        opacity: 0,
    }, depthInfo));

    readonly red = new THREE.MeshBasicMaterial(Object.assign({
        color: 0xff0000
    }));

    readonly green = new THREE.MeshBasicMaterial(Object.assign({
        color: 0x00ff00
    }));

    readonly blue = new THREE.MeshBasicMaterial(Object.assign({
        color: 0x0000ff
    }));

    readonly yellow = new THREE.MeshBasicMaterial(Object.assign({
        color: 0xffff00
    }));

    readonly yellowTransparent = new THREE.MeshBasicMaterial(Object.assign({
        opacity: 0.25,
        color: 0xffff00
    }, depthInfo));

    readonly magentaTransparent = new THREE.MeshBasicMaterial(Object.assign({
        opacity: 0.25,
        color: 0xff00ff
    }, depthInfo));

    readonly cyanTransparent = new THREE.MeshBasicMaterial(Object.assign({
        opacity: 0.25,
        color: 0x00ffff
    }, depthInfo));

    readonly line = new LineMaterial(Object.assign({
        color: 0xffffff,
        linewidth: 2,
    }, depthInfo));

    readonly lineRed = new LineMaterial(Object.assign({
        color: 0xff0000,
        linewidth: 2,
    }, depthInfo));

    readonly lineGreen = new LineMaterial(Object.assign({
        color: 0x00ff00,
        linewidth: 2,
    }, depthInfo));

    readonly lineBlue = new LineMaterial(Object.assign({
        color: 0x0000ff,
        linewidth: 2,
    }, depthInfo));

    readonly lineYellow = new LineMaterial(Object.assign({
        color: 0xffff00,
        linewidth: 2,
    }, depthInfo));

    private readonly lines = [this.line, this.lineRed, this.lineGreen, this.lineBlue, this.lineYellow];

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(([, resolution]) => this.setResolution(resolution));
    }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    setResolution(size: THREE.Vector2) {
        const width = size.x, height = size.y;
        for (const material of this.lines) {
            material.resolution.set(width, height);
        }
    }
}