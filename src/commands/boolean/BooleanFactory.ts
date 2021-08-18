import { MaterialOverride } from "../../editor/GeometryDatabase";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from '../../editor/SnapManager';
import * as visual from '../../editor/VisualModel';
import { curve3d2curve2d, vec2vec } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import ExtrudeFactory from "../extrude/ExtrudeFactory";


interface BooleanLikeFactory extends GeometryFactory {
    operationType: c3d.OperationType;
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

    private _solid!: visual.Solid;
    solidModel!: c3d.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid) {
        this._solid = solid;
        this.solidModel = this.db.lookup(solid)
    }

    private _tool!: visual.Solid;
    toolModel!: c3d.Solid;
    get tool() { return this._tool }
    set tool(tool: visual.Solid) {
        this._tool = tool;
        this.toolModel = this.db.lookup(tool)
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.BooleanSolid, c3d.ESides.SideNone, 0);
    protected _isOverlapping = false;

    async computeGeometry() {
        const { solidModel, toolModel, names, mergingFaces, mergingEdges } = this;

        const flags = new c3d.BooleanFlags();
        flags.InitBoolean(true);
        flags.SetMergingFaces(mergingFaces);
        flags.SetMergingEdges(mergingEdges);

        const result = await c3d.ActionSolid.BooleanResult_async(solidModel, c3d.CopyMode.Copy, toolModel, c3d.CopyMode.Copy, this.operationType, flags, names);
        this._isOverlapping = true;
        return result;
    }

    protected get phantom(): c3d.Solid | undefined {
        if (this.operationType === c3d.OperationType.Union) return;

        return this.toolModel;
    }

    get phantomMaterial() {
        if (this.operationType === c3d.OperationType.Difference)
            return phantom_red
        else if (this.operationType === c3d.OperationType.Intersect)
            return phantom_green;
    }

    get originalItem() {
        return [this.solid, this.tool];
    }

    get shouldRemoveOriginalItem() {
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
}

export class CutFactory extends GeometryFactory {
    solid!: visual.Solid;
    contour!: c3d.Contour;
    placement!: c3d.Placement3D;
    constructionPlane?: PlaneSnap;
    mergingFaces = true;
    mergingEdges = true;
    prolongContour = true;
    
    private fantom = new ExtrudeSurfaceFactory(this.db, this.materials, this.signals);
    private names = new c3d.SNameMaker(c3d.CreatorType.CuttingSolid, c3d.ESides.SideNone, 0);

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


    async computeGeometry() {
        const { db, contour, placement, names, fantom } = this;

        const solid = db.lookup(this.solid);
        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);

        fantom.model = new c3d.PlaneCurve(placement, contour, true);
        fantom.direction = placement.GetAxisZ();
        this._phantom = await fantom.computeGeometry();

        const params = new c3d.ShellCuttingParams(placement, contour, false, direction, flags, true, names);
        const results = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, params);

        return [...results];
    }

    get originalItem() { return this.solid }

    get phantomMaterial() {
        return phantom_red;
    }

    protected _phantom!: c3d.SpaceInstance;
    get phantom() { return this._phantom }
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
        if (solid !== undefined) this.model = this.db.lookup(solid);
    }

    protected _isOverlapping = false;
    get isOverlapping() { return this._isOverlapping }

    protected async precomputeGeometry() {
        const phantom = await this.fantom.computeGeometry() as c3d.Solid;
        this._phantom = phantom;
        if (this.solid === undefined) {
            this._isOverlapping = false;
        } else {
            this._isOverlapping = c3d.Action.IsSolidsIntersection(this.model!, phantom, new c3d.SNameMaker(-1, c3d.ESides.SideNone, 0));
        }
    }

    async computeGeometry() {
        await this.precomputeGeometry();
        if (this._isOverlapping && !this.newBody) {
            const result = await this.bool.computeGeometry() as c3d.Solid;
            return result;
        } else {
            return this._phantom;
        }
    }

    protected get phantom(): c3d.Solid | undefined {
        if (this.solid === undefined) return;
        if (this.newBody) return;
        if (this.operationType === c3d.OperationType.Union) return;
        if (!this._isOverlapping) return;

        return this._phantom;
    }

    get originalItem() { return this.solid }

    get shouldRemoveOriginalItem() {
        return this._isOverlapping && this.solid !== undefined && !this.newBody;
    }

    get phantomMaterial() {
        if (this.operationType === c3d.OperationType.Difference)
            return phantom_red
        else if (this.operationType === c3d.OperationType.Intersect)
            return phantom_green;
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

class ExtrudeSurfaceFactory extends GeometryFactory {
    direction!: c3d.Vector3D;

    private _curve!: visual.SpaceInstance<visual.Curve3D>;
    model!: c3d.Curve3D;

    get curve() { return this._curve }
    set curve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        this.model = item.Cast<c3d.Curve3D>(item.IsA());
    }

    async computeGeometry() {
        const { model, direction } = this;
        const result = c3d.ActionSurface.ExtrusionSurface(model, new c3d.Vector3D(direction.x, direction.y, direction.z), true);
        return new c3d.SpaceInstance(result);
    }
}