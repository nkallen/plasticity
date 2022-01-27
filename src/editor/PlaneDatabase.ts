import { ConstructionPlaneSnap } from "./snaps/Snap";
import * as THREE from "three";

const freeze = Object.freeze;
const origin = freeze(new THREE.Vector3());
const X = freeze(new THREE.Vector3(1, 0, 0));
const Y = freeze(new THREE.Vector3(0, 1, 0));
const Z = freeze(new THREE.Vector3(0, 0, 1));

export class PlaneDatabase {
    readonly XY = new ConstructionPlaneSnap(Z, origin, "XY");
    readonly YZ = new ConstructionPlaneSnap(X, origin, "YZ");
    readonly XZ = new ConstructionPlaneSnap(Y, origin, "XZ");
    readonly default = this.XY;

    get all(): ConstructionPlaneSnap[] {
        return [
            this.XY, this.YZ, this.XZ
        ];
    }
}