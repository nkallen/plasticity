import { EditorSignals } from "../editor/EditorSignals";
import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const depthInfo: THREE.MaterialParameters = {
    depthTest: true,
    depthWrite: true,
    fog: false,
    toneMapped: false,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
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

    static make(normalColor: THREE.Color, hoverColor: THREE.Color, side = THREE.FrontSide): GizmoMaterial {
        return {
            mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 0.75, color: normalColor }, depthInfo, { side })),
            line2: new LineMaterial({ ...depthInfo, color: normalColor.getHex(), opacity: 1, linewidth: 2, side }),
            line: new THREE.LineBasicMaterial({ opacity: 0.75, color: normalColor }),
            hover: {
                mesh: new THREE.MeshBasicMaterial(Object.assign({ opacity: 1, color: hoverColor }, depthInfo, { side })),
                line2: new LineMaterial(Object.assign({ color: hoverColor.getHex(), opacity: 1, linewidth: 3, }, depthInfo, { side })),
                line: new THREE.LineBasicMaterial({ opacity: 1, color: hoverColor }),
            }
        }
    }

    constructor(signals: EditorSignals, style: StyleDeclaration = new DefaultStyles()) {
        signals.renderPrepared.add(({ resolution }) => this.setResolution(resolution));
        this.setColor(style);
    }

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


    private _default!: GizmoMaterial;
    get default() { return this._default }

    private _red!: GizmoMaterial;
    get red() { return this._red }

    private _darkGray!: GizmoMaterial;
    get darkGray() { return this._darkGray }

    private _green!: GizmoMaterial;
    get green() { return this._green }

    private _blue!: GizmoMaterial;
    get blue() { return this._blue }

    private _yellow!: GizmoMaterial;
    get yellow() { return this._yellow }

    private _white!: GizmoMaterial;
    get white() { return this._white }

    private _magenta!: GizmoMaterial;
    get magenta() { return this._magenta }

    private _cyan!: GizmoMaterial;
    get cyan() { return this._cyan }

    // A quirk of three.js is that to render lines with any thickness, you need to use
    // a LineMaterial whose resolution must be set before each render
    setResolution = (size: THREE.Vector2) => {
        const width = size.x, height = size.y;
        for (const color of this.all) {
            color.line2.resolution.set(width, height);
            color.hover.line2.resolution.set(width, height);
        }
    }

    get all() {
        return [this.default, this.red, this.darkGray, this.green, this.blue, this.yellow, this.white, this.magenta, this.cyan];
    }

    private setColor(style: StyleDeclaration) {
        for (const color of this.all) {
            if (color === undefined) continue;
            color.line.dispose(); color.line2.dispose(); color.mesh.dispose();
            color.hover.line.dispose(); color.hover.line2.dispose(); color.hover.mesh.dispose();
        }

        const red = new THREE.Color(style.getPropertyValue('--red-600') || '#dc2626').convertSRGBToLinear();
        const green = new THREE.Color(style.getPropertyValue('--green-600') || '#16a34a').convertSRGBToLinear();
        const blue = new THREE.Color(style.getPropertyValue('--blue-600') || '#2563eb').convertSRGBToLinear();
        const dark = new THREE.Color(style.getPropertyValue('--neutral-800') || '#202020').convertSRGBToLinear();
        const yellow = new THREE.Color(style.getPropertyValue('--yellow-300') || '#fde047').convertSRGBToLinear();
        const white = new THREE.Color(style.getPropertyValue('--neutral-50') || '#e2e2e2').convertSRGBToLinear();

        const red_hover = new THREE.Color(style.getPropertyValue('--red-400') || '#f87171').convertSRGBToLinear();
        const green_hover = new THREE.Color(style.getPropertyValue('--green-400') || '#4ade80').convertSRGBToLinear();
        const blue_hover = new THREE.Color(style.getPropertyValue('--blue-400') || '#60a5fa').convertSRGBToLinear();
        const dark_hover = new THREE.Color(style.getPropertyValue('--neutral-500') || '#484848').convertSRGBToLinear();
        const yellow_hover = new THREE.Color(style.getPropertyValue('--yellow-200') || '#fef08a').convertSRGBToLinear();
        const white_hover = new THREE.Color(style.getPropertyValue('--white') || '#ffffff').convertSRGBToLinear();

        this._default = GizmoMaterialDatabase.make(yellow, yellow_hover);
        this._red = GizmoMaterialDatabase.make(red, red_hover);
        this._darkGray = GizmoMaterialDatabase.make(dark, dark_hover);
        this._green = GizmoMaterialDatabase.make(green, green_hover);
        this._blue = GizmoMaterialDatabase.make(blue, blue_hover);
        this._white = GizmoMaterialDatabase.make(white, white_hover);

        const magenta = new THREE.Color().lerpColors(red, blue, 0.5);
        const magenta_hover = new THREE.Color().lerpColors(red_hover, blue_hover, 0.5);

        const cyan = new THREE.Color().lerpColors(green, blue, 0.5);
        const cyan_hover = new THREE.Color().lerpColors(green_hover, blue_hover, 0.5);

        this._yellow = GizmoMaterialDatabase.make(yellow, yellow_hover, THREE.DoubleSide);
        this._magenta = GizmoMaterialDatabase.make(magenta, magenta_hover, THREE.DoubleSide)
        this._cyan = GizmoMaterialDatabase.make(cyan, cyan_hover, THREE.DoubleSide);
    }
}

export interface StyleDeclaration {
    getPropertyValue(property: string): string;
}

export class DefaultStyles implements StyleDeclaration {
    getPropertyValue(property: string): string {
        return '';
    }
}