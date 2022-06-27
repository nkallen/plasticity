import * as THREE from "three";
import { Snap, Restriction } from "./Snap";
import { AxisSnap } from "./AxisSnap";
import { PlaneSnap } from "./PlaneSnap";


export class PointSnap extends Snap {
    readonly position: THREE.Vector3;
    static snapperGeometry = new THREE.SphereGeometry(0.1);
    static nearbyGeometry = new THREE.SphereGeometry(0.2);

    constructor(readonly name?: string, position = new THREE.Vector3(), protected readonly normal = Z) {
        super();

        this.position = position.clone();
        super.init();
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

    restrictionFor(point: THREE.Vector3): Restriction | undefined {
        return new PlaneSnap(this.normal, this.position);
    }
}
const Z = new THREE.Vector3(0, 0, 1);
