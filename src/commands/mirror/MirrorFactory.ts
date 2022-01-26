import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { delegate } from "../../command/FactoryBuilder";
import { GeometryFactory, NoOpError, PhantomInfo } from '../../command/GeometryFactory';
import { MultiGeometryFactory } from "../../command/MultiFactory";
import { MaterialOverride, TemporaryObject } from "../../editor/DatabaseLike";
import { composeMainName, point2point, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';

export interface MirrorParams {
    shouldCut: boolean;
    shouldUnion: boolean;
    origin: THREE.Vector3;
    quaternion: THREE.Quaternion;
    normal: THREE.Vector3;
    plane: visual.Face;
    move: number;
}

export interface MirrorFactoryLike extends GeometryFactory, MirrorParams {
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

// NOTE: This class works with more than just solids, whereas the others don't.
export class MirrorFactory extends GeometryFactory implements MirrorParams {
    item!: visual.Item;
    origin!: THREE.Vector3;
    normal!: THREE.Vector3;
    shouldCut = true;
    shouldUnion = false;
    move = 0;

    get items() { return [this.item] }

    set quaternion(orientation: THREE.Quaternion) {
        this.normal = Z.clone().applyQuaternion(orientation);
    }

    set plane(face: visual.Face) {
        const model = this.db.lookupTopologyItem(face);
        const placement = model.GetControlPlacement();
        model.OrientPlacement(placement);
        placement.Normalize(); // FIXME: a bug in c3d? necessary with curved faces
        this.origin = point2point(placement.GetOrigin());
        this.normal = vec2vec(placement.GetAxisY(), 1);
    }

    async calculate() {
        const { origin, normal, move } = this;
        if (origin === undefined || normal === undefined) throw new NoOpError();

        const model = this.db.lookup(this.item);
        const transformed = model.Duplicate().Cast<c3d.Item>(model.IsA());
        const mat = new c3d.Matrix3D();
        mat.Symmetry(point2point(origin), vec2vec(normal, 1));
        mat.SetOffset(point2point(normal.clone().multiplyScalar(move)));
        transformed.Transform(mat);

        return transformed;
    }
}

export class SymmetryFactory extends GeometryFactory {
    origin = new THREE.Vector3();
    shouldCut = true;
    shouldUnion = false;
    move = 0;

    quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);

    get normal() {
        return Z.clone().applyQuaternion(this.quaternion);
    }
    set normal(normal: THREE.Vector3) {
        normal = normal.clone().normalize();
        Z.set(0, 0, -1);
        this.quaternion.setFromUnitVectors(Z, normal);
    }

    private model!: c3d.Solid;
    private _solid!: visual.Solid;
    get solid(): visual.Solid { return this._solid }
    set solid(solid: visual.Solid | c3d.Solid) {
        if (solid instanceof visual.Solid) {
            this._solid = solid;
            this.model = this.db.lookup(solid);
        } else {
            this.model = solid;
        }
    }

    set plane(face: visual.Face) {
        const model = this.db.lookupTopologyItem(face);
        const placement = model.GetControlPlacement();
        model.OrientPlacement(placement);
        placement.Normalize(); // FIXME: a bug in c3d? necessary with curved faces
        this.origin = point2point(placement.GetOrigin());
        const normal = vec2vec(placement.GetAxisY(), -1);
        this.quaternion.setFromUnitVectors(Z, normal);
    }

    private readonly X = new THREE.Vector3(1, 0, 0);
    private readonly Y = new THREE.Vector3(0, 1, 0);
    private readonly Z = new THREE.Vector3(0, 0, 1);

    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.SymmetrySolid, this.db.version), c3d.ESides.SideNone, 0);

    async beforeCalculate() {
        const { shouldCut, model, names } = this;
        const { params, mirrorPlacement } = this.shellCuttingParams;

        let original = model;
        let cutAndMirrored = model
        if (shouldCut) {
            try {
                const results = await c3d.ActionSolid.SolidCutting_async(cutAndMirrored, c3d.CopyMode.Copy, params);
                cutAndMirrored = results[1] ?? results[0];
                original = cutAndMirrored;
            } catch { }
        }
        cutAndMirrored = await c3d.ActionSolid.MirrorSolid_async(cutAndMirrored, mirrorPlacement, names);

        return { cutAndMirrored, cut: original, mirrorPlacement };
    }

    async calculate() {
        const { shouldCut, shouldUnion, model, names } = this;

        const { cutAndMirrored, cut, mirrorPlacement } = await this.beforeCalculate();

        const mergeFlags = new c3d.MergingFlags(true, true);

        if (shouldCut && shouldUnion) {
            try {
                return [await c3d.ActionSolid.SymmetrySolid_async(model, c3d.CopyMode.Copy, mirrorPlacement, names)];
            } catch (e) {
                const mirrored = await c3d.ActionSolid.MirrorSolid_async(model, mirrorPlacement, names);
                const { result } = await c3d.ActionSolid.UnionResult_async(mirrored, c3d.CopyMode.Copy, [model], c3d.CopyMode.Copy, c3d.OperationType.Union, false, mergeFlags, names, false);
                return [result];
            }
        } else {
            if (!shouldCut && !shouldUnion) return [cutAndMirrored]; // actually, its just mirrored in this case
            else if (shouldCut && !shouldUnion) return [cut, cutAndMirrored];
            else if (!shouldCut && shouldUnion) {
                const { result: unioned } = await c3d.ActionSolid.UnionResult_async(cutAndMirrored, c3d.CopyMode.Copy, [cut], c3d.CopyMode.Copy, c3d.OperationType.Union, false, mergeFlags, names, false);
                return [unioned];
            }
            throw new Error("unreachable");
        }
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const { cutAndMirrored } = await this.beforeCalculate();
        const material = phantom_blue;
        return [{ phantom: cutAndMirrored, material }];
    }

    get shouldHideOriginalItemDuringUpdate(): boolean {
        return this.shouldCut || this.shouldUnion;
    }

    get shouldRemoveOriginalItemOnCommit(): boolean {
        return this.shouldCut || this.shouldUnion;
    }

    async doUpdate(abortEarly: () => boolean) {
        const { solid, model } = this;

        return this.db.optimization(solid, async () => {
            const { Z, params } = this.shellCuttingParams;
            try {
                let result = model;
                if (this.shouldCut) {
                    const results = await c3d.ActionSolid.SolidCutting_async(model, c3d.CopyMode.Copy, params);
                    result = results[1] ?? results[0];
                }

                const temp = await this.db.replaceWithTemporaryItem(solid, result);
                // TODO: this mirrored object isn't temporarily invisible. Have to eventually
                // investigate how it interacts with modifiers.
                const mirrored = temp.underlying.clone();
                mirrored.scale.reflect(Z.normalize());
                temp.underlying.add(mirrored);
                // mirrored.visible = true;

                this.cleanupTemps();
                return this.temps = this.showTemps([temp]);
            } catch {
                this.cleanupTemps();
                return [];
            }
        }, () => super.doUpdate(abortEarly));
    }

    private readonly offsetOrigin = new THREE.Vector3();
    get shellCuttingParams() {
        const { origin, quaternion, move, names } = this;
        const { offsetOrigin } = this;
        offsetOrigin.set(0, 0, move / 2).applyQuaternion(quaternion).add(origin);

        const point1 = new c3d.CartPoint(0, -1000);
        const point2 = new c3d.CartPoint(0, 1000);
        const line = c3d.ActionCurve.Segment(point1, point2);

        const { X, Z } = this;
        X.set(1, 0, 0).applyQuaternion(quaternion);
        Z.set(0, 0, -1).applyQuaternion(quaternion);
        const z = vec2vec(Z, 1);
        const x = vec2vec(X, 1);
        const c3d_offsetOrigin = point2point(offsetOrigin);
        const cutPlacement = new c3d.Placement3D(c3d_offsetOrigin, x, z, false);
        const mirrorPlacement = new c3d.Placement3D(c3d_offsetOrigin, z, x, false);

        const contour = new c3d.Contour([line], true);
        const direction = new c3d.Vector3D(0, 0, 0);
        const flags = new c3d.MergingFlags(true, true);
        const params = new c3d.ShellCuttingParams(cutPlacement, contour, false, direction, flags, true, names);
        return { Z, mirrorPlacement, params };
    }

    get originalItem() { return this.solid }

    toJSON() {
        return {
            dataType: 'SymmetryFactory',
            params: {
                origin: this.origin,
                move: this.move,
                quaternion: this.quaternion,
                shouldCut: this.shouldCut,
                shouldUnion: this.shouldUnion,
            },
        }
    }

    fromJSON(json: any) {
        const origin = new THREE.Vector3();
        Object.assign(origin, json.origin);
        const quaternion = new THREE.Quaternion();
        Object.assign(quaternion, json.quaternion);
        this.origin = origin;
        this.move = json.move;
        this.quaternion = quaternion;
        this.shouldCut = json.shouldCut;
        this.shouldUnion = json.shouldUnion;
    }
}

export class MultiSymmetryFactory extends MultiGeometryFactory<SymmetryFactory> implements MirrorParams {
    get items() { return this.solids }
    private _solids!: visual.Solid[];
    get solids() { return this._solids }
    set solids(solids: visual.Solid[]) {
        this._solids = solids;
        const factories = [];
        for (const solid of solids) {
            const factory = new SymmetryFactory(this.db, this.materials, this.signals);
            factory.solid = solid;
            factories.push(factory);
        }
        this.factories = factories;
    }

    @delegate.get normal!: THREE.Vector3;
    @delegate.get origin!: THREE.Vector3;

    @delegate move!: number;
    @delegate.default(true) shouldCut!: boolean;
    @delegate.default(false) shouldUnion!: boolean;
    @delegate quaternion!: THREE.Quaternion;
    @delegate plane!: visual.Face;

    get shouldHideOriginalItemDuringUpdate() { return this.shouldCut || this.shouldUnion }
    get shouldRemoveOriginalItemOnCommit() { return this.shouldCut || this.shouldUnion }
}

const mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0x0000ff);
mesh_blue.opacity = 0.1;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;

const phantom_blue: MaterialOverride = {
    mesh: mesh_blue
}
