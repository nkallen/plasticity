import * as THREE from 'three';
import * as visual from "../../visual_model/VisualModel";

export class FloorHelper extends THREE.Group {
    private readonly grid1: THREE.GridHelper;
    private readonly grid2: THREE.GridHelper;

    constructor(size: number, divisions: number, private readonly color1: THREE.Color, private readonly color2: THREE.Color) {
        super();

        const grid1 = new THREE.GridHelper(size, divisions, color1, color1);
        const material1 = grid1.material as THREE.LineBasicMaterial;
        material1.transparent = true;
        material1.vertexColors = false;
        material1.color = color1;
        material1.fog = true;
        this.add(grid1);
        this.grid1 = grid1;

        const grid2 = new THREE.GridHelper(size, divisions / 10, color2, color2);
        const material2 = grid2.material as THREE.LineBasicMaterial;
        material2.transparent = true;
        material2.vertexColors = false;
        material2.color = color2;
        material2.fog = true;
        this.add(grid2);
        this.grid2 = grid2;

        grid1.geometry.rotateX(Math.PI / 2);
        grid2.geometry.rotateX(Math.PI / 2);
        this.layers.set(visual.Layers.Overlay);
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
