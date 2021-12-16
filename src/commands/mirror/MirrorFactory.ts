import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { MaterialOverride, TemporaryObject } from '../../editor/GeometryDatabase';
import { composeMainName, point2point, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory, NoOpError, PhantomInfo } from '../GeometryFactory';

export interface MirrorParams {
    clipping: boolean;
    origin: THREE.Vector3;
    quaternion: THREE.Quaternion;
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class MirrorOrSymmetryFactory extends GeometryFactory implements MirrorParams {
    private readonly mirror = new MirrorFactory(this.db, this.materials, this.signals);
    private readonly symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
    clipping = true;

    set item(item: visual.Item) {
        this.mirror.item = item;
        if (item instanceof visual.Solid) {
            this.symmetry.solid = item;
        }
    }

    set normal(normal: THREE.Vector3) {
        normal = normal.clone().normalize();
        this.mirror.normal = normal;
        this.symmetry.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, normal);
    }

    get quaternion() { return this.symmetry.quaternion }
    set quaternion(orientation: THREE.Quaternion) {
        this.mirror.normal = Z.clone().applyQuaternion(orientation);
        this.symmetry.quaternion = orientation;
    }

    get origin() { return this.mirror.origin }
    set origin(origin: THREE.Vector3) {
        this.mirror.origin = origin;
        this.symmetry.origin = origin;
    }

    set face(face: visual.Face) {
        this.mirror.face = face;
        this.symmetry.face = face;
    }

    calculate() {
        if (this.clipping && this.mirror.item instanceof visual.Solid) return this.symmetry.calculate();
        else return this.mirror.calculate();
    }

    get originalItem() {
        if (this.clipping && this.mirror.item instanceof visual.Solid) return this.mirror.item;
        else return [];
    }

    get phantoms() {
        if (this.clipping && this.mirror.item instanceof visual.Solid) return this.symmetry.phantoms;
        else return [];
    }
}

export class MirrorFactory extends GeometryFactory {
    item!: visual.Item;
    origin!: THREE.Vector3;
    normal!: THREE.Vector3;

    set face(face: visual.Face) {
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
}

export class SymmetryFactory extends GeometryFactory {
    origin = new THREE.Vector3();
    quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);

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

    set face(face: visual.Face) {
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
        const { model, origin, quaternion, names } = this;

        const { X, Y, Z } = this;
        Z.set(0, 0, -1).applyQuaternion(quaternion);
        X.set(1, 0, 0).applyQuaternion(quaternion);
        const z = vec2vec(Z, 1);
        const x = vec2vec(X, 1);
        const placement = new c3d.Placement3D(point2point(origin), z, x, false);

        this.computePhantom(placement);

        try {
            this._isOverlapping = true;
            return c3d.ActionSolid.SymmetrySolid(model, c3d.CopyMode.Copy, placement, names);
        } catch (e) {
            this._isOverlapping = false;
            const mirrored = c3d.ActionSolid.MirrorSolid(model, placement, names);
            const { result } = c3d.ActionSolid.UnionResult(mirrored, c3d.CopyMode.Copy, [model], c3d.CopyMode.Copy, c3d.OperationType.Union, false, new c3d.MergingFlags(), names, false);
            return result;
        }
    }

    private _phantom!: c3d.Solid;
    private computePhantom(placement: c3d.Placement3D) {
        const { model, names } = this;
        const { params } = this.shellCuttingParams;
        let cut = model;
        try {
            const results = c3d.ActionSolid.SolidCutting(cut, c3d.CopyMode.Copy, params);
            cut = results[0];
        } catch { }
        const mirrored = c3d.ActionSolid.MirrorSolid(cut, placement, names);
        this._phantom = mirrored;
    }

    get phantoms(): PhantomInfo[] {
        const phantom = this._phantom;
        const material = phantom_blue;
        return [{ phantom, material }];
    }

    // protected get shouldHideOriginalItemDuringUpdate(): boolean {
    //     return false;
    // }

    private temp?: TemporaryObject;

    async doUpdate() {
        const { solid, model } = this;

        return this.db.optimization(solid, async () => {
            const { Z, params } = this.shellCuttingParams;
            try {
                const results = c3d.ActionSolid.SolidCutting(model, c3d.CopyMode.Copy, params);
                const result = results[0];

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
        const { solid, model, origin, quaternion: quaternion, names } = this;

        const point1 = new c3d.CartPoint(0, -1000);
        const point2 = new c3d.CartPoint(0, 1000);
        const line = c3d.ActionCurve.Segment(point1, point2);

        const { X, Y, Z } = this;
        Z.set(0, 0, -1).applyQuaternion(quaternion);
        X.set(1, 0, 0).applyQuaternion(quaternion);
        const z = vec2vec(Z, 1);
        const x = vec2vec(X, 1);
        const placement = new c3d.Placement3D(point2point(origin), x, z, false);

        const contour = new c3d.Contour([line], true);
        const direction = new c3d.Vector3D(0, 0, 0);
        const flags = new c3d.MergingFlags(true, true);
        const params = new c3d.ShellCuttingParams(placement, contour, false, direction, 1, flags, true, names);
        return { Z, params };
    }

    get originalItem() { return this.solid }
    protected _isOverlapping = false;

    // get shouldRemoveOriginalItem() {
    //     return this._isOverlapping;
    // }

    toJSON() {
        return {
            dataType: 'SymmetryFactory',
            params: {
                origin: this.origin,
                quaternion: this.quaternion,
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
    }
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
