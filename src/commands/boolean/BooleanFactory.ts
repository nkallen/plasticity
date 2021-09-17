import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { MaterialOverride } from "../../editor/GeometryDatabase";
import { PlaneSnap } from '../../editor/snaps/SnapManager';
import * as visual from '../../editor/VisualModel';
import { curve3d2curve2d, point2point, vec2vec } from '../../util/Conversion';
import { ExtrudeSurfaceFactory } from "../extrude/ExtrudeSurfaceFactory";
import { GeometryFactory, PhantomInfo, ValidationError } from '../GeometryFactory';

interface BooleanLikeFactory extends GeometryFactory {
    solid?: visual.Solid;
    operationType: c3d.OperationType;

    // NOTE: These are hints for the factory to infer which operation
    isOverlapping: boolean;
    isSurface: boolean;
}

export interface BooleanParams {
    operationType: c3d.OperationType;
    mergingFaces: boolean;
    mergingEdges: boolean;
}

export class BooleanFactory extends GeometryFactory implements BooleanLikeFactory, BooleanParams {
    operationType: c3d.OperationType = c3d.OperationType.Difference;
    mergingFaces = true;
    mergingEdges = true;

    isOverlapping = false;
    isSurface = false;

    private _solid!: visual.Solid;
    solidModel!: c3d.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.solidModel = this.db.lookup(solid)
    }

    private _tools!: visual.Solid[];
    toolModels!: c3d.Solid[];
    get tools() { return this._tools }
    set tools(tools: visual.Solid[]) {
        this._tools = tools;
        this.toolModels = tools.map(t => this.db.lookup(t));
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);
    protected _isOverlapping = false;

    async calculate() {
        const { solidModel, toolModels, names, mergingFaces, mergingEdges } = this;

        const flags = new c3d.MergingFlags();
        flags.SetMergingFaces(mergingFaces);
        flags.SetMergingEdges(mergingEdges);

        const { result, notGluedSolids } = await c3d.ActionSolid.UnionResult_async(solidModel, c3d.CopyMode.Copy, toolModels, c3d.CopyMode.Copy, this.operationType, true, flags, names, false);
        this._isOverlapping = true;
        return result;
    }

    protected get phantoms(): PhantomInfo[] {
        if (this.operationType === c3d.OperationType.Union) return [];

        let material: MaterialOverride;
        if (this.operationType === c3d.OperationType.Difference)
            material = phantom_red
        else if (this.operationType === c3d.OperationType.Intersect)
            material = phantom_green;
        else material = phantom_blue;

        const result = [];
        for (const phantom of this.toolModels) {
            result.push({ phantom, material })
        }
        if (this.operationType === c3d.OperationType.Intersect)
            result.push({ phantom: this.solidModel, material: phantom_blue });
        return result;
    }

    get originalItem() {
        return [this.solid, ...this.tools];
    }

    get shouldRemoveOriginalItemOnCommit() {
        return this._isOverlapping;
    }
}

export class UnionFactory extends BooleanFactory {
    operationType = c3d.OperationType.Union;
}

export class IntersectionFactory extends BooleanFactory {
    operationType = c3d.OperationType.Intersect;
}

export class DifferenceFactory extends BooleanFactory {
    operationType = c3d.OperationType.Difference;
}

export interface CutParams {
    mergingFaces: boolean;
    mergingEdges: boolean;
    prolongContour: boolean;
    constructionPlane?: PlaneSnap;
    solid?: visual.Solid;
}

abstract class AbstractCutFactory extends GeometryFactory implements CutParams {
    solid!: visual.Solid;
    protected contour!: c3d.Contour;
    protected placement!: c3d.Placement3D;
    constructionPlane?: PlaneSnap;
    mergingFaces = true;
    mergingEdges = true;
    prolongContour = true;

    private fantom = new ExtrudeSurfaceFactory(this.db, this.materials, this.signals);
    protected abstract names: c3d.SNameMaker;

    set curve(inst: visual.SpaceInstance<visual.Curve3D>) {
        const instance = this.db.lookup(inst);
        const item = instance.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const planar = curve3d2curve2d(curve3d, this.constructionPlane?.placement ?? new c3d.Placement3D());
        if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
        const { curve: curve2d, placement } = planar;

        this.contour = new c3d.Contour([curve2d], true);
        this.placement = placement;
    }

    protected async computePhantom() {
        const { contour, placement, fantom } = this;

        const Z = vec2vec(placement.GetAxisZ(), 1);
        const bbox = new THREE.Box3().setFromObject(this.solid);
        let inout_max = point2point(bbox.max);
        let inout_min = point2point(bbox.min);
        placement.GetPointInto(inout_max);
        placement.GetPointInto(inout_min);
        Z.multiplyScalar(Math.abs(inout_max.z) > Math.abs(inout_min.z) ? inout_max.z : inout_min.z);

        fantom.model = new c3d.PlaneCurve(placement, contour, true);
        fantom.direction = Z;
        this._phantom = await fantom.calculate();
    }

    get originalItem() { return this.solid }

    protected _phantom!: c3d.SpaceInstance;
    get phantoms() {
        const phantom = this._phantom;
        const material = { surface: surface_red };
        return [{ phantom, material }]
    }
}

export class CutFactory extends AbstractCutFactory {
    protected names = new c3d.SNameMaker(c3d.CreatorType.CuttingSolid, c3d.ESides.SideNone, 0);

    async calculate() {
        const { db, contour, placement, names } = this;

        const solid = db.lookup(this.solid);
        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);

        this.computePhantom();

        const params = new c3d.ShellCuttingParams(placement, contour, false, direction, flags, true, names);
        const results = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, params);

        return [...results];
    }
}

export class SplitFactory extends AbstractCutFactory {
    private _faces!: visual.Face[];
    private models!: c3d.Face[];
    get faces() { return this._faces }
    set faces(faces: visual.Face[]) {
        this._faces = faces;
        const models = [];
        for (const face of faces) {
            models.push(this.db.lookupTopologyItem(face));
        }
        this.models = models;
        this.solid = faces[0].parentItem;
    }

    protected names = new c3d.SNameMaker(c3d.CreatorType.DraftSolid, c3d.ESides.SideNone, 0);

    async calculate() {
        const { db, contour, placement, names, models } = this;

        const solid = db.lookup(this.solid);
        const flags = new c3d.MergingFlags(true, true);

        this.computePhantom();

        const result = c3d.ActionSolid.SplitSolid(solid, c3d.CopyMode.Copy, placement, c3d.SenseValue.BOTH, [contour], false, models, flags, names);

        return result;
    }
}

export class CutAndSplitFactory extends GeometryFactory implements CutParams {
    private cut = new CutFactory(this.db, this.materials, this.signals);
    private split = new SplitFactory(this.db, this.materials, this.signals);

    get faces() { return this.split.faces ?? [] }
    set faces(faces: visual.Face[]) { if (faces.length > 0) this.split.faces = faces }
    set solid(solid: visual.Solid) { this.cut.solid = solid }

    set curve(curve: visual.SpaceInstance<visual.Curve3D>) { this.cut.curve = curve; this.split.curve = curve }
    set mergingFaces(mergingFaces: boolean) { this.cut.mergingFaces = mergingFaces; this.split.mergingFaces = mergingFaces }
    set mergingEdges(mergingEdges: boolean) { this.cut.mergingEdges = mergingEdges; this.split.mergingEdges = mergingEdges }
    set prolongContour(prolongContour: boolean) { this.cut.prolongContour = prolongContour; this.split.prolongContour = prolongContour }
    set constructionPlane(constructionPlane: PlaneSnap | undefined) { this.cut.constructionPlane = constructionPlane; this.split.constructionPlane = constructionPlane }

    async calculate() {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.calculate();
        else return split.calculate();
    }

    get phantoms() {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.phantoms;
        else return split.phantoms;
    }

    get originalItem() {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.originalItem;
        else return split.originalItem;
    }
}

export abstract class PossiblyBooleanFactory<GF extends GeometryFactory> extends GeometryFactory {
    protected abstract bool: BooleanLikeFactory;
    protected abstract fantom: GF;

    protected _phantom!: c3d.Solid;

    newBody = false;

    get operationType() { return this.bool.operationType }
    set operationType(operationType: c3d.OperationType) { this.bool.operationType = operationType }

    protected _solid?: visual.Solid;
    protected model?: c3d.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid | undefined) {
        this._solid = solid;
        if (solid !== undefined) {
            this.bool.solid = solid;
            this.model = this.db.lookup(solid);
        }
    }

    protected _isOverlapping = false;
    get isOverlapping() { return this._isOverlapping }
    set isOverlapping(isOverlapping: boolean) {
        this._isOverlapping = isOverlapping;
        this.bool.isOverlapping = isOverlapping;
    }

    protected _isSurface = false;
    get isSurface() { return this._isSurface }
    set isSurface(isSurface: boolean) {
        this._isSurface = isSurface;
        this.bool.isSurface = isSurface;
    }

    protected async precomputeGeometry() {
        const phantom = await this.fantom.calculate() as c3d.Solid;
        this._phantom = phantom;
        if (this.solid === undefined) {
            this.isOverlapping = false;
            this.isSurface = false;
        } else {
            const { isIntersection, intData } = c3d.Action.IsSolidsIntersection(this.model!, new c3d.Matrix3D(), phantom, new c3d.Matrix3D(), true, false, false);
            this.isOverlapping = isIntersection;
            if (intData.length === 0)  {
                this.isSurface = false;
            } else {
                this.isSurface = intData[0].IsSurface() && !intData[0].IsSolid();
            }
        }
    }

    async calculate() {
        await this.precomputeGeometry();
        if (this.isOverlapping && !this.newBody) {
            const result = await this.bool.calculate() as c3d.Solid;
            return result;
        } else {
            return this._phantom;
        }
    }

    protected get phantoms(): PhantomInfo[] {
        if (this.solid === undefined) return [];
        if (this.newBody) return [];
        if (this.operationType === c3d.OperationType.Union) return [];
        if (!this.isOverlapping) return [];

        let material: MaterialOverride
        if (this.operationType === c3d.OperationType.Difference) material = phantom_red;
        else if (this.operationType === c3d.OperationType.Intersect) material = phantom_green;
        else material = phantom_blue;

        const phantom = this._phantom;

        return [{ phantom, material }];
    }

    get originalItem() { return this.solid }

    get shouldRemoveOriginalItemOnCommit() {
        return this.isOverlapping && this.solid !== undefined && !this.newBody;
    }
}

const mesh_red = new THREE.MeshBasicMaterial();
mesh_red.color.setHex(0xff0000);
mesh_red.opacity = 0.1;
mesh_red.transparent = true;
mesh_red.fog = false;
mesh_red.polygonOffset = true;
mesh_red.polygonOffsetFactor = 0.1;
mesh_red.polygonOffsetUnits = 1;

const surface_red = mesh_red.clone();
surface_red.side = THREE.DoubleSide;

const phantom_red: MaterialOverride = {
    mesh: mesh_red
}

const mesh_green = new THREE.MeshBasicMaterial();
mesh_green.color.setHex(0x00ff00);
mesh_green.opacity = 0.1;
mesh_green.transparent = true;
mesh_green.fog = false;
mesh_green.polygonOffset = true;
mesh_green.polygonOffsetFactor = 0.1;
mesh_green.polygonOffsetUnits = 1;

const phantom_green: MaterialOverride = {
    mesh: mesh_green
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
