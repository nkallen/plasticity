import * as THREE from 'three';
import { LineBasicMaterial } from 'three';
import * as visual from "../../visual_model/VisualModel";
import { ProxyCamera } from './ProxyCamera';

export class OrthoModeGrid extends THREE.Group {
    protected readonly grid1: THREE.GridHelper;
    protected readonly grid2: THREE.GridHelper;

    constructor(private readonly size: number, divisions: number, private readonly color1: THREE.Color, private readonly color2: THREE.Color, private readonly backgroundColor: THREE.Color) {
        super();

        const grid1 = this.makeGrid1(size, divisions, color1);
        this.grid1 = grid1;

        const grid2 = this.makeGrid2(size, divisions, color2);
        this.grid2 = grid2;

        this.add(grid1, grid2);
        this.layers.set(visual.Layers.Overlay);
        this.renderOrder = -1;
    }

    protected makeGrid2(size: number, divisions: number, color2: THREE.Color) {
        const grid2 = new THREE.GridHelper(size, divisions / 10, color2, color2);
        const material = grid2.material as THREE.LineBasicMaterial;
        material.vertexColors = false;
        material.color.copy(color2);
        material.depthWrite = false;
        material.depthFunc = THREE.NeverDepth;
        material.fog = true;
        grid2.geometry.rotateX(Math.PI / 2);
        return grid2;
    }

    protected makeGrid1(size: number, divisions: number, color1: THREE.Color) {
        const grid1 = new THREE.GridHelper(size, divisions, color1, color1);
        const material = grid1.material as THREE.LineBasicMaterial;
        material.vertexColors = false;
        material.color.copy(color1);
        material.depthWrite = false;
        material.depthFunc = THREE.NeverDepth;
        material.fog = true;
        grid1.geometry.rotateX(Math.PI / 2);
        return grid1;
    }

    dispose() {
        this.grid1.geometry.dispose();
        const material1 = this.grid1.material as LineBasicMaterial;
        material1.dispose();
        this.grid1.removeFromParent();

        this.grid2.geometry.dispose();
        const material2 = this.grid2.material as LineBasicMaterial;
        material2.dispose();
    }

    update(camera: THREE.Camera) {
        let factor;
        if (ProxyCamera.isOrthographic(camera)) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else throw new Error("invalid camera type");
        const material1 = this.grid1.material as THREE.LineBasicMaterial;
        material1.color.lerpColors(this.backgroundColor, this.color1, Math.min(1 / factor, 1));
        this.grid1.visible = factor < 10;
        this.updateMatrixWorld();
    }
}


export class FloorHelper extends THREE.Group {
    private readonly grid1: THREE.GridHelper;
    private readonly grid2: THREE.GridHelper;

    constructor(private readonly size: number, divisions: number, private readonly color1: THREE.Color, private readonly color2: THREE.Color) {
        super();

        const grid1 = this.makeGrid1(size, divisions, color1);
        this.grid1 = grid1;

        const grid2 = this.makeGrid2(size, divisions, color2);
        this.grid2 = grid2;
        
        this.add(grid1, grid2);
        this.layers.set(visual.Layers.Overlay);
    }

    private makeGrid2(size: number, divisions: number, color2: THREE.Color) {
        const grid2 = new THREE.GridHelper(size, divisions / 10, color2, color2);
        const material2 = grid2.material as THREE.LineBasicMaterial;
        material2.transparent = true;
        material2.vertexColors = false;
        material2.color.copy(color2);
        material2.fog = true;
        grid2.geometry.rotateX(Math.PI / 2);
        return grid2;
    }

    private makeGrid1(size: number, divisions: number, color1: THREE.Color) {
        const grid1 = new THREE.GridHelper(size, divisions, color1, color1);
        const material1 = grid1.material as THREE.LineBasicMaterial;
        material1.transparent = true;
        material1.vertexColors = false;
        material1.color.copy(color1);
        material1.fog = true;
        grid1.geometry.rotateX(Math.PI / 2);
        return grid1;
    }

    dispose() {
        this.grid1.geometry.dispose();
        const material1 = this.grid1.material as LineBasicMaterial;
        material1.dispose();
        this.grid1.removeFromParent();

        this.grid2.geometry.dispose();
        const material2 = this.grid2.material as LineBasicMaterial;
        material2.dispose();
    }

    private readonly grid = new THREE.Vector3(0, 1, 0);
    private readonly eye = new THREE.Vector3(0, 0, 1);
    update(camera: THREE.Camera) {
        const { grid, eye, grid1, grid2 } = this;

        grid.set(0, 0, 1).applyQuaternion(this.quaternion);
        eye.set(0, 0, 1).applyQuaternion(camera.quaternion);
        const dot = grid.dot(eye);
        const material1 = grid1.material as THREE.LineBasicMaterial;
        const material2 = grid2.material as THREE.LineBasicMaterial;
        const dotSq = dot * dot;
        material1.opacity = material2.opacity = dotSq;
        this.updateMatrixWorld();
    }
}

export class CustomGrid extends THREE.Group {
    private readonly grid1: THREE.GridHelper;
    private readonly grid2: THREE.GridHelper;

    constructor(private readonly size: number, divisions: number, private readonly color1: THREE.Color, private readonly color2: THREE.Color, private readonly backgroundColor: THREE.Color) {
        super();

        const grid1 = this.makeGrid1(size, divisions, color1);
        this.grid1 = grid1;

        const grid2 = this.makeGrid2(size, divisions, color2);
        this.grid2 = grid2;
        
        this.add(grid1, grid2);
        this.layers.set(visual.Layers.Overlay);
    }

    private makeGrid2(size: number, divisions: number, color2: THREE.Color) {
        const grid2 = new THREE.GridHelper(size, divisions / 10, color2, color2);
        const material2 = grid2.material as THREE.LineBasicMaterial;
        material2.transparent = true;
        material2.vertexColors = false;
        material2.color.copy(color2);
        material2.fog = true;
        grid2.geometry.rotateX(Math.PI / 2);
        return grid2;
    }

    private makeGrid1(size: number, divisions: number, color1: THREE.Color) {
        const grid1 = new THREE.GridHelper(size, divisions, color1, color1);
        const material1 = grid1.material as THREE.LineBasicMaterial;
        material1.transparent = true;
        material1.vertexColors = false;
        material1.color.copy(color1);
        material1.fog = true;
        grid1.geometry.rotateX(Math.PI / 2);
        return grid1;
    }

    dispose() {
        this.grid1.geometry.dispose();
        const material1 = this.grid1.material as LineBasicMaterial;
        material1.dispose();
        this.grid1.removeFromParent();

        this.grid2.geometry.dispose();
        const material2 = this.grid2.material as LineBasicMaterial;
        material2.dispose();
    }

    private readonly grid = new THREE.Vector3(0, 1, 0);
    private readonly eye = new THREE.Vector3(0, 0, 1);
    update(camera: THREE.Camera) {
        const { grid, eye, grid1, grid2 } = this;

        grid.set(0, 0, 1).applyQuaternion(this.quaternion);
        eye.set(0, 0, 1).applyQuaternion(camera.quaternion);
        const dot = grid.dot(eye);
        const material1 = grid1.material as THREE.LineBasicMaterial;
        const material2 = grid2.material as THREE.LineBasicMaterial;
        const dotSq = dot * dot;
        material1.opacity = material2.opacity = dotSq;

        let factor;
        if (ProxyCamera.isOrthographic(camera)) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else if (ProxyCamera.isPerspective(camera)) {
            factor = this.position.distanceTo(camera.position) * Math.min(1.9 * Math.tan(Math.PI * camera.fov / 360), 7);
        } else throw new Error("invalid camera type");


        material1.opacity *= 1 / factor;
        this.grid1.visible = factor < 10;

        this.updateMatrixWorld();
    }
}
