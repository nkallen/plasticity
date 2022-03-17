import * as THREE from "three";
import { EditorSignals } from "./EditorSignals";
import { ConstructionPlaneSnap, FaceConstructionPlaneSnap, ScreenSpaceConstructionPlaneSnap } from "./snaps/ConstructionPlaneSnap";

const freeze = Object.freeze;
const origin = freeze(new THREE.Vector3());
const X = freeze(new THREE.Vector3(1, 0, 0));
const Y = freeze(new THREE.Vector3(0, 1, 0));
const Z = freeze(new THREE.Vector3(0, 0, 1));

export class PlaneDatabase {
    private counter = 0;

    static readonly XY = new ConstructionPlaneSnap(Z, origin, undefined, "XY");
    static readonly YZ = new ConstructionPlaneSnap(X, origin, undefined, "YZ");
    static readonly XZ = new ConstructionPlaneSnap(Y, origin, undefined, "XZ");
    static readonly ScreenSpace = new ScreenSpaceConstructionPlaneSnap(this.XY);

    private readonly _all = new Set<ConstructionPlaneSnap>([PlaneDatabase.XY, PlaneDatabase.YZ, PlaneDatabase.XZ]);

    constructor(private readonly signals: EditorSignals) { }

    get all(): Iterable<ConstructionPlaneSnap> { return this._all }

    temp<T extends ConstructionPlaneSnap | FaceConstructionPlaneSnap>(plane: T): T {
        this.signals.temporaryConstructionPlaneAdded.dispatch(plane);
        return plane;
    }

    add(plane: ConstructionPlaneSnap | FaceConstructionPlaneSnap) {
        this._all.add(new ConstructionPlaneSnap(plane.n, plane.p, undefined, `Custom plane ${this.counter++}`));
        this.signals.constructionPlanesChanged.dispatch();
    }
}