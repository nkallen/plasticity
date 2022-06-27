import * as THREE from "three";
import { PointSnap } from "./PointSnap";

export interface Restriction {
    isValid(pt: THREE.Vector3): boolean;
    project(point: THREE.Vector3, snapToGrid?: GridLike): SnapProjection;
}

export abstract class Snap implements Restriction {
    readonly name?: string = undefined;
    readonly helper?: THREE.Object3D; // another indicator, like a long line for axis snaps

    protected init() {
        const { helper } = this;

        helper?.updateMatrixWorld();
    }

    abstract project(point: THREE.Vector3, snapToGrid?: GridLike): SnapProjection;
    abstract isValid(pt: THREE.Vector3): boolean;

    restrictionFor(point: THREE.Vector3): Restriction | undefined { return; }
    additionalSnapsFor(point: THREE.Vector3): RaycastableSnap[] { return []; }
    additionalSnapsGivenPreviousSnap(point: THREE.Vector3, lastPickedSnap: Snap): Snap[] { return []; }
}

/**
 * Whereas a Snap represents any snap target, many kinds of snap have specially optimized
 * picking/raycasting implementations. However, some snaps, the "RaycastableSnaps", have
 * a generic raycasting implementation with a "snapper" object.
 * 
 */
export abstract class RaycastableSnap extends Snap {
    abstract readonly snapper: THREE.Object3D; // the actual object to snap to, used in raycasting when snapping

    protected override init() {
        const { snapper, helper } = this;
        if (snapper === helper)
            throw new Error("Snapper should not === helper because snappers have userData and helpers should be simple cloneable objects");

        super.init();

        snapper.updateMatrixWorld();

        snapper.userData.snap = this;
        snapper.traverse(c => {
            c.userData.snap = this;
        });
    }
}

export interface ChoosableSnap extends Snap {
    intersect(raycaster: THREE.Raycaster, info?: { position: THREE.Vector3; orientation: THREE.Quaternion; }): SnapProjection | undefined;
}

export interface GridLike {
    snapToGrid(point: THREE.Vector3, compat: Snap): THREE.Vector3;
}

export type SnapProjection = {
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
};

export class OrRestriction<R extends Restriction> implements Restriction {
    match!: R;
    constructor(private readonly underlying: R[]) { }

    isValid(pt: THREE.Vector3): boolean {
        for (const restriction of this.underlying) {
            if (restriction.isValid(pt)) {
                this.match = restriction;
                return true;
            }
        }
        return false;
    }

    project(point: THREE.Vector3): { position: THREE.Vector3; orientation: THREE.Quaternion } {
        return this.match.project(point);
    }
}