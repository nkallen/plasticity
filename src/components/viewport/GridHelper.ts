import * as THREE from 'three';
import { PlaneDatabase } from '../../editor/PlaneDatabase';
import { ConstructionPlane } from '../../editor/snaps/ConstructionPlaneSnap';
import { FloorHelper, OrthoModeGrid, CustomGrid } from './FloorHelper';

const floorSize = 150;
const defaultFloorDivisions = floorSize;
const defaultGridDivisions = defaultFloorDivisions * 100;

export class GridHelper {
    private gridDivisions = defaultGridDivisions;
    private floor = new FloorHelper(floorSize, defaultFloorDivisions, this.color1, this.color2);
    private gridBackground = new OrthoModeGrid(floorSize * 10, this.gridDivisions, this.color1, this.color2, this.backgroundColor);
    private customGrid = new CustomGrid(floorSize * 10, this.gridDivisions, this.color1, this.color2, this.backgroundColor);

    constructor(private readonly color1: THREE.Color, private readonly color2: THREE.Color, private readonly backgroundColor: THREE.Color) { }

    private readonly lookAt = new THREE.Matrix4();
    getOverlay(isOrthoMode: boolean, constructionPlane: ConstructionPlane, camera: THREE.Camera): THREE.Object3D {
        const { floor, gridBackground, customGrid } = this;

        if (isOrthoMode || constructionPlane === PlaneDatabase.ScreenSpace) {
            gridBackground.position.copy(constructionPlane.p);
            gridBackground.quaternion.copy(camera.quaternion);
            gridBackground.update(camera);
            return gridBackground;
        } else if (constructionPlane !== PlaneDatabase.XY) {
            const { lookAt } = this;
            customGrid.position.copy(constructionPlane.p);
            lookAt.lookAt(constructionPlane.p.clone().add(constructionPlane.n), constructionPlane.p, Z);
            customGrid.quaternion.setFromRotationMatrix(lookAt);
            customGrid.update(camera);
            return customGrid;
        } else {
            floor.update(camera);
            return floor;
        }
    }

    resizeGrid(factor: number) {
        this.gridDivisions *= factor;
        this.gridBackground.dispose();
        this.customGrid.dispose();
        this.gridBackground = new OrthoModeGrid(floorSize * 10, this.gridDivisions, this.color1, this.color2, this.backgroundColor);
        this.customGrid = new CustomGrid(floorSize * 10, this.gridDivisions, this.color1, this.color2, this.backgroundColor);
    }
}

const Z = new THREE.Vector3(0, 0, 1);
Object.freeze(Z);
