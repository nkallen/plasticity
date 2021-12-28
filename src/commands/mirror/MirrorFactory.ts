import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { MaterialOverride, TemporaryObject } from '../../editor/GeometryDatabase';
import { composeMainName, point2point, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory, NoOpError, PhantomInfo } from '../../command/GeometryFactory';
import { assertUnreachable } from "../../util/Util";

export interface MirrorParams {
    shouldCut: boolean;
    shouldUnion: boolean;
    origin: THREE.Vector3;
    quaternion: THREE.Quaternion;
    normal: THREE.Vector3;
    plane: visual.Face;
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
        const { origin, normal } = this;
        if (origin === undefined || normal === undefined) throw new NoOpError();

        const model = this.db.lookup(this.item);
        const transformed = model.Duplicate().Cast<c3d.Item>(model.IsA());
        const mat = new c3d.Matrix3D();
        mat.Symmetry(point2point(origin), vec2vec(normal, 1));
        transformed.Transform(mat);

        return transformed;
    }


    get shouldHideOriginalItemDuringUpdate(): boolean {
        return super.shouldHideOriginalItemDuringUpdate;
    }

    get shouldRemoveOriginalItemOnCommit(): boolean {
        return super.shouldRemoveOriginalItemOnCommit;
    }
}

export class SymmetryFactory extends GeometryFactory {
    origin = new THREE.Vector3();
    quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
    shouldCut = true;
    shouldUnion = false;

    set normal(normal: THREE.Vector3) {
        normal = normal.clone().normalize();
        const { Z } = this;
        // Z.set(0, 0, -1);
        this.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, normal);
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
        const normal = vec2vec(placement.GetAxisY(), 1);
        this.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, normal);
    }

    private readonly X = new THREE.Vector3(1, 0, 0);
    private readonly Y = new THREE.Vector3(0, 1, 0);
    private readonly Z = new THREE.Vector3(0, 0, 1);

    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.SymmetrySolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { shouldCut, shouldUnion, model, origin, quaternion, names } = this;

        const { X, Z } = this;
        Z.set(0, 0, -1).applyQuaternion(quaternion);
        X.set(1, 0, 0).applyQuaternion(quaternion);

        const z = vec2vec(Z, 1);
        const x = vec2vec(X, 1);
        const placement = new c3d.Placement3D(point2point(origin), z, x, false);

        const { params } = this.shellCuttingParams;
        const mergeFlags = new c3d.MergingFlags(true, true);
        
        let original = model;
        let cutAndMirrored = model
        if (shouldCut) {
            try {
                const results = c3d.ActionSolid.SolidCutting(cutAndMirrored, c3d.CopyMode.Copy, params);
                cutAndMirrored = results[1] ?? results[0];
                original = cutAndMirrored;
            } catch { }
        }
        cutAndMirrored = c3d.ActionSolid.MirrorSolid(cutAndMirrored, placement, names);
        this._phantom = cutAndMirrored;

        if (shouldCut && shouldUnion) {
            try {
                return [c3d.ActionSolid.SymmetrySolid(model, c3d.CopyMode.Copy, placement, names)];
            } catch (e) {
                const mirrored = c3d.ActionSolid.MirrorSolid(model, placement, names);
                const { result } = c3d.ActionSolid.UnionResult(mirrored, c3d.CopyMode.Copy, [model], c3d.CopyMode.Copy, c3d.OperationType.Union, false, mergeFlags, names, false);
                return [result];
            }
        } else {
            if (!shouldCut && !shouldUnion) return [cutAndMirrored]; // actually, its just mirrored in this case
            else if (shouldCut && !shouldUnion) return [original, cutAndMirrored];
            else if (!shouldCut && shouldUnion) {
                const { result: unioned } = c3d.ActionSolid.UnionResult(cutAndMirrored, c3d.CopyMode.Copy, [original], c3d.CopyMode.Copy, c3d.OperationType.Union, false, mergeFlags, names, false);
                return [unioned];
            }
            throw new Error("unreachable");
        }
    }

    private _phantom!: c3d.Solid;

    get phantoms(): PhantomInfo[] {
        const phantom = this._phantom;
        const material = phantom_blue;
        return [{ phantom, material }];
    }

    get shouldHideOriginalItemDuringUpdate(): boolean {
        return this.shouldCut || this.shouldUnion;
    }

    get shouldRemoveOriginalItemOnCommit(): boolean {
        return this.shouldCut || this.shouldUnion;
    }

    private temp?: TemporaryObject;

    async doUpdate() {
        const { solid, model } = this;

        return this.db.optimization(solid, async () => {
            const { Z, params } = this.shellCuttingParams;
            try {
                let result = model;
                if (this.shouldCut) {
                    const results = c3d.ActionSolid.SolidCutting(model, c3d.CopyMode.Copy, params);
                    result = results[1] ?? results[0];
                }

                const temp = await this.db.replaceWithTemporaryItem(solid, result);
                const view = temp.underlying;
                const mirrored = view.clone();
                mirrored.scale.reflect(Z);
                view.add(mirrored);

                this.temp?.cancel();
                this.temp = temp;
                temp.show();
                temp.underlying.updateMatrixWorld();
                mirrored.visible = true;

                return [temp];
            } catch {
                this.temp?.cancel();
                return [];
            }
        }, () => super.doUpdate());
    }

    get shellCuttingParams() {
        const { origin, quaternion: quaternion, names } = this;

        const point1 = new c3d.CartPoint(0, -1000);
        const point2 = new c3d.CartPoint(0, 1000);
        const line = c3d.ActionCurve.Segment(point1, point2);

        const { X, Z } = this;
        Z.set(0, 0, -1).applyQuaternion(quaternion);
        X.set(1, 0, 0).applyQuaternion(quaternion);
        const z = vec2vec(Z, 1);
        const x = vec2vec(X, 1);
        const placement = new c3d.Placement3D(point2point(origin), x, z, false);

        const contour = new c3d.Contour([line], true);
        const direction = new c3d.Vector3D(0, 0, 0);
        const flags = new c3d.MergingFlags(true, true);
        const params = new c3d.ShellCuttingParams(placement, contour, false, direction, flags, true, names);
        return { Z, placement, params };
    }

    get originalItem() { return this.solid }


    toJSON() {
        return {
            dataType: 'SymmetryFactory',
            params: {
                origin: this.origin,
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
        this.quaternion = quaternion;
        this.shouldCut = json.shouldCut;
        this.shouldUnion = json.shouldUnion;
    }
}

export class MultiSymmetryFactory extends GeometryFactory implements MirrorParams {
    private individuals!: SymmetryFactory[];

    set solids(solids: visual.Solid[]) {
        const individuals = [];
        for (const solid of solids) {
            const individual = new SymmetryFactory(this.db, this.materials, this.signals);
            individual.solid = solid;
            individuals.push(individual);
        }
        this.individuals = individuals;
    }

    _shouldCut = true;
    _shouldUnion = false;

    get shouldCut() { return this._shouldCut }
    set shouldCut(shouldCut: boolean) {
        this._shouldCut = shouldCut;
        this.individuals.forEach(i => i.shouldCut = shouldCut)
    }

    get shouldUnion() { return this._shouldUnion }
    set shouldUnion(shouldUnion: boolean) {
        this._shouldUnion = shouldUnion;
        this.individuals.forEach(i => i.shouldUnion = shouldUnion)
    }
    set origin(origin: THREE.Vector3) { this.individuals.forEach(i => i.origin = origin) }
    set quaternion(quaternion: THREE.Quaternion) { this.individuals.forEach(i => i.quaternion = quaternion) }
    set normal(normal: THREE.Vector3) { this.individuals.forEach(i => i.normal = normal) }
    set plane(face: visual.Face) { this.individuals.forEach(i => i.plane = face) }

    async calculate() {
        const { individuals } = this;
        const result = [];
        for (const individual of individuals) {
            result.push(individual.calculate());
        }
        return (await Promise.all(result)).flat();
    }

    protected get phantoms(): PhantomInfo[] {
        return this.individuals.map(i => i.phantoms).flat();
    }

    protected get originalItem() {
        return this.individuals.map(i => i.originalItem);
    }

    get shouldHideOriginalItemDuringUpdate() { return this.shouldCut || this._shouldUnion }
    get shouldRemoveOriginalItemOnCommit() { return this.shouldCut || this._shouldUnion }
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
