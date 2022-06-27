import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { PointResult } from "../../command/point-picker/PointPicker";
import { PlaneSnap } from "./PlaneSnap";
import { GridLike, RaycastableSnap, Snap } from "./Snap";
import { FaceSnap } from "./Snaps";

export interface ConstructionPlane extends RaycastableSnap, GridLike {
    get n(): THREE.Vector3;
    get p(): THREE.Vector3;
    get x(): THREE.Vector3 | undefined;
    get orientation(): THREE.Quaternion;
    get placement(): c3d.Placement3D;
    move(vector: THREE.Vector3): ConstructionPlane;
    isCompatibleWithSnap(snap: Snap): boolean;
    get isTemp(): boolean;
    gridFactor: number;
}

// The main purpose of this class is to have a lower priority in raycasting than other, explicitly added snaps.
export class ConstructionPlaneSnap extends PlaneSnap implements ConstructionPlane {
    private _useNominal: undefined;

    move(pt: THREE.Vector3) {
        return new ConstructionPlaneSnap(this.n, pt);
    }

    // NOTE: A construction plane accepts all points, projecting them
    override isValid(pt: THREE.Vector3) { return true }

    get isTemp() { return this.name === undefined }
}

export class FaceConstructionPlaneSnap extends PlaneSnap implements ConstructionPlane {
    private _useNominal: undefined;

    constructor(normal: THREE.Vector3, p: THREE.Vector3, x: THREE.Vector3 | undefined, readonly faceSnap: FaceSnap) {
        super(normal, p, x, "Face plane");
    }

    isCompatibleWithSnap(snap: Snap) {
        return snap !== this.faceSnap;
    }

    move(pt: THREE.Vector3) {
        return new FaceConstructionPlaneSnap(this.n, pt, this.x, this.faceSnap);
    }

    override isValid(pt: THREE.Vector3) { return true }
    get isTemp() { return true }
}

type State = { tag: 'none'; } | { tag: 'start'; snap: ConstructionPlaneSnap; };

export class ScreenSpaceConstructionPlaneSnap extends RaycastableSnap implements ConstructionPlane {
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

    get x() { return undefined }

    get orientation() {
        switch (this.state.tag) {
            case 'none': return this.basis.orientation;
            case 'start': return this.state.snap.orientation;
        }
    }

    move(delta: THREE.Vector3) {
        // FIXME: this seems wrong
        return this;
    }

    snapToGrid(position: THREE.Vector3) {
        return position;
    }

    gridFactor = 1;

    get placement() {
        switch (this.state.tag) {
            case 'none': return this.basis.placement;
            case 'start': return this.state.snap.placement;
        }
    }

    get isTemp() { return false }
    isCompatibleWithSnap(_: Snap) { return true }
}
