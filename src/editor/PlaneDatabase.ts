import { ConstructionPlaneSnap } from "./snaps/Snap";
import * as THREE from "three";
import { EditorSignals } from "./EditorSignals";

const freeze = Object.freeze;
const origin = freeze(new THREE.Vector3());
const X = freeze(new THREE.Vector3(1, 0, 0));
const Y = freeze(new THREE.Vector3(0, 1, 0));
const Z = freeze(new THREE.Vector3(0, 0, 1));

export class PlaneDatabase {
    private counter = 0;

    static readonly XY = new ConstructionPlaneSnap(Z, origin, "XY");
    static readonly YZ = new ConstructionPlaneSnap(X, origin, "YZ");
    static readonly XZ = new ConstructionPlaneSnap(Y, origin, "XZ");
    static readonly ScreenSpace = new ConstructionPlaneSnap(origin, origin, "ScreenSpace");
    readonly default = PlaneDatabase.XY;

    private readonly _all = new Set<ConstructionPlaneSnap>([PlaneDatabase.XY, PlaneDatabase.YZ, PlaneDatabase.XZ, PlaneDatabase.ScreenSpace]);

    constructor(private readonly signals: EditorSignals) { }

    get all(): Iterable<ConstructionPlaneSnap> { return this._all }

    temp(plane: ConstructionPlaneSnap) {
        if (!this._all.has(plane)) this.signals.temporaryConstructionPlaneAdded.dispatch(plane);
        return plane;
    }

    add(plane: ConstructionPlaneSnap) {
        this._all.add(new ConstructionPlaneSnap(plane.n, plane.p, `Custom plane ${this.counter++}`));
        this.signals.constructionPlanesChanged.dispatch();
    }
}