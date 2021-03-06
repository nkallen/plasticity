import * as THREE from "three";
import { Z } from "../../util/Constants";
import { AxisSnap } from "./AxisSnap";
import { Snap } from "./Snap";


export class PointSnap extends Snap {
    readonly position: THREE.Vector3;

    constructor(readonly name?: string, position = new THREE.Vector3(), protected readonly normal = Z) {
        super();
        this.position = position.clone();
    }

    project(point: THREE.Vector3) {
        const position = this.position;
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, this.normal);
        return { position, orientation };
    }

    axes(axisSnaps: Iterable<AxisSnap>) {
        const o = this.position.clone();
        const result = [];
        for (const snap of axisSnaps) {
            result.push(snap.move(o));
        }

        return result;
    }

    isValid(pt: THREE.Vector3): boolean {
        return this.position.manhattanDistanceTo(pt) < 10e-6;
    }
}
