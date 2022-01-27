import * as THREE from "three";
import { PointResult } from "../../command/PointPicker";
import {  PlaneSnap, Snap } from "./Snap";
import c3d from '../../../build/Release/c3d.node';

export interface ConstructionPlane extends Snap {
    get n(): THREE.Vector3;
    get p(): THREE.Vector3;
    get placement(): c3d.Placement3D;
    move(vector: THREE.Vector3): ConstructionPlane;
}

// The main purpose of this class is to have a lower priority in raycasting than other, explicitly added snaps.
export class ConstructionPlaneSnap extends PlaneSnap implements ConstructionPlane {
    move(pt: THREE.Vector3) {
        return new ConstructionPlaneSnap(this.n, pt);
    }

    // NOTE: A construction plane accepts all points, projecting them
    override isValid(pt: THREE.Vector3) { return true }
}

type State = { tag: 'none'; } | { tag: 'start'; snap: ConstructionPlaneSnap; };

export class ScreenSpaceConstructionPlaneSnap extends Snap implements ConstructionPlane {
    readonly name = "Screen Space";
    private state: State = { tag: 'none' };
    snapper!: THREE.Object3D;

    constructor(private readonly basis: ConstructionPlaneSnap) {
        super();
        this.snapper = basis.snapper;
    }

    set(pointResult: PointResult) {
        if (this.state.tag !== 'none') return;

        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(pointResult.info.cameraOrientation);

        const snap = new ConstructionPlaneSnap(n, pointResult.point);
        this.snapper = snap.snapper;
        this.state = { tag: 'start', snap };
    }

    reset() {
        this.snapper = this.basis.snapper;
        this.state = { tag: 'none' };
    }

    project(point: THREE.Vector3): { position: THREE.Vector3; orientation: THREE.Quaternion; } {
        switch (this.state.tag) {
            case 'none': return this.basis.project(point);
            case 'start': return this.state.snap.project(point);
        }
    }

    isValid(pt: THREE.Vector3): boolean {
        switch (this.state.tag) {
            case 'none': return this.basis.isValid(pt);
            case 'start': return this.state.snap.isValid(pt);
        }
    }

    get n() {
        switch (this.state.tag) {
            case 'none': return this.basis.n;
            case 'start': return this.state.snap.n;
        }
    }

    get p() {
        switch (this.state.tag) {
            case 'none': return this.basis.p;
            case 'start': return this.state.snap.p;
        }
    }

    move(delta: THREE.Vector3) {
        // FIXME: this seems wrong
        return this;
    }

    get placement() {
        switch (this.state.tag) {
            case 'none': return this.basis.placement;
            case 'start': return this.state.snap.placement;
        }
    }
}
