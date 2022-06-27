import { X, Y, Z, origin } from "../../util/Constants";
import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { point2point, vec2vec } from "../../util/Conversion";
import { AxisSnap } from "./AxisSnap";
import { GridLike, NonPointSnap, Snap } from "./Snap";

const material = new THREE.MeshBasicMaterial();
material.side = THREE.DoubleSide;

export class PlaneSnap extends NonPointSnap implements GridLike {
    static geometry = new THREE.PlaneGeometry(10000, 10000, 2, 2);

    readonly snapper: THREE.Object3D = new THREE.Mesh(PlaneSnap.geometry, material);

    readonly n: THREE.Vector3;
    readonly p: THREE.Vector3;
    readonly x: THREE.Vector3;
    readonly orientation = new THREE.Quaternion();

    private readonly basis = new THREE.Matrix4();
    private readonly basisInv = new THREE.Matrix4();

    static from(origin: THREE.Vector3, quaternion: THREE.Quaternion) {
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        return new PlaneSnap(n, origin);
    }

    // Even small (e.g., 10e-4) errors in the orientation can screw up coplanar calculations.
    // mat.lookAt, which is awesome for getting a great orientation for a weird plane, can introduce
    // such errors.
    private static readonly mat = new THREE.Matrix4();
    private static avoidNumericalPrecisionProblems(n: THREE.Vector3, orientation: THREE.Quaternion) {
        if (n.dot(Z) === 1) {
            orientation.identity();
        } else if (n.dot(X) === 1) {
            orientation.set(0.5, 0.5, 0.5, 0.5);
        } else if (n.dot(Y) === 1) {
            orientation.set(0, Math.SQRT1_2, Math.SQRT1_2, 0);
        } else {
            const { mat } = this;
            mat.lookAt(n.clone().add(origin), origin, Z);
            orientation.setFromRotationMatrix(mat).normalize();
        }
    }

    private readonly translate = new THREE.Matrix4();
    constructor(normal = Z, p = new THREE.Vector3(), x?: THREE.Vector3, readonly name?: string) {
        super();

        normal = normal.clone();
        p = p.clone();
        this.snapper.lookAt(normal);
        this.snapper.position.copy(p);
        this.n = normal;
        this.p = p;
        if (x !== undefined) {
            const { translate } = this;
            this.x = x;
            PlaneSnap.avoidNumericalPrecisionProblems(normal, this.orientation);
            const wrong_x = new THREE.Vector3(1, 0, 0).applyQuaternion(this.orientation).normalize();
            const wrongToRight = new THREE.Quaternion().setFromUnitVectors(wrong_x, x);
            this.orientation.premultiply(wrongToRight);
            translate.makeTranslation(p.x, p.y, p.z);
            this.basis.makeBasis(x, this.y.crossVectors(x, normal).normalize(), normal).premultiply(translate);
            this.basisInv.copy(this.basis).invert();
        } else {
            const { translate } = this;
            PlaneSnap.avoidNumericalPrecisionProblems(normal, this.orientation);
            this.x = new THREE.Vector3(1, 0, 0).applyQuaternion(this.orientation).normalize();
            translate.makeTranslation(p.x, p.y, p.z);
            this.basis.makeBasis(this.x, this.y.crossVectors(this.x, normal).normalize(), normal).premultiply(translate);
            this.basisInv.copy(this.basis).invert();
        }
        this.init();
    }

    private _gridFactor = 1;
    get gridFactor() { return this._gridFactor; }
    set gridFactor(factor: number) {
        if (factor > 10 || factor < 0)
            throw new Error("invalid precondition");
        this._gridFactor = factor;
    }

    private readonly y = new THREE.Vector3();
    project(intersection: THREE.Vector3 | THREE.Intersection, snapToGrid?: GridLike) {
        const point = intersection instanceof THREE.Vector3 ? intersection : intersection.point;
        const { plane, orientation } = this;
        let position = plane.projectPoint(point, new THREE.Vector3());
        snapToGrid?.snapToGrid(position, this);
        return { position, orientation };
    }

    snapToGrid(position: THREE.Vector3, compat: Snap) {
        if (compat instanceof PlaneSnap && compat !== this) return position;
        const { plane } = this;
        if (compat instanceof AxisSnap && !compat.isCoplanar(plane)) return position;

        let { gridFactor, basis, basisInv } = this;
        gridFactor *= 10;
        position.applyMatrix4(basisInv);
        position.set(
            Math.round(position.x * gridFactor) / gridFactor,
            Math.round(position.y * gridFactor) / gridFactor,
            0);
        position.applyMatrix4(basis);
        return position;
    }

    get plane(): THREE.Plane {
        const { n, p } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        return plane;
    }

    move(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }

    private readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, p } = this;
        return Math.abs(this.valid.copy(pt).sub(p).dot(n)) < 10e-4;
    }

    get placement() {
        return new c3d.Placement3D(point2point(this.p), vec2vec(this.n, 1), vec2vec(this.x, 1), false);
    }

    get isTemp() { return true; }
    isCompatibleWithSnap(_: Snap) { return true; }
}

