import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from "../../editor/snaps/Snap";
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, curve3d2curve2d, point2point, vec2vec } from '../../util/Conversion';
import { ExtrudeSurfaceFactory } from "../extrude/ExtrudeSurfaceFactory";
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export interface CutParams {
    mergingFaces: boolean;
    mergingEdges: boolean;
    constructionPlane?: PlaneSnap;
    solid?: visual.Solid;
}

type CutMode = { tag: 'contour', contour: c3d.Contour, placement: c3d.Placement3D } | { tag: 'surface', surface: c3d.Surface }

abstract class AbstractCutFactory extends GeometryFactory implements CutParams {
    solid!: visual.Solid;
    constructionPlane?: PlaneSnap;
    mergingFaces = true;
    mergingEdges = true;
    protected mode!: CutMode;

    private fantom = new ExtrudeSurfaceFactory(this.db, this.materials, this.signals);
    protected abstract names: c3d.SNameMaker;

    set curve(inst: visual.SpaceInstance<visual.Curve3D>) {
        const instance = this.db.lookup(inst);
        const item = instance.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const planar = curve3d2curve2d(curve3d, this.constructionPlane?.placement ?? new c3d.Placement3D());
        if (planar === undefined)
            throw new ValidationError("Curve cannot be converted to planar");
        const { curve: curve2d, placement } = planar;

        this.mode = { tag: 'contour', contour: new c3d.Contour([curve2d], true), placement };
    }

    set plane(face: visual.Face) {
        const model = this.db.lookupTopologyItem(face);
        this.mode = { tag: 'surface', surface: model.GetSurface().GetSurface() }
    }

    protected async computePhantom() {
        const { mode, fantom } = this;

        switch (mode.tag) {
            case 'contour':
                const { placement, contour } = mode;
                const Z = vec2vec(placement.GetAxisZ(), 1);
                const bbox = new THREE.Box3().setFromObject(this.solid);
                let inout_max = bbox.max;
                let inout_min = bbox.min;
                placement.GetPointInto(point2point(inout_max));
                placement.GetPointInto(point2point(inout_min));
                Z.multiplyScalar(Math.abs(inout_max.z) > Math.abs(inout_min.z) ? inout_max.z : inout_min.z);

                fantom.model = new c3d.PlaneCurve(placement, contour, true);
                fantom.direction = Z;
                this._phantom = await fantom.calculate();
                break;
            case 'surface':
                this._phantom = new c3d.SpaceInstance(mode.surface);
        }
    }

    get originalItem() { return this.solid; }

    protected _phantom!: c3d.SpaceInstance;
    get phantoms() {
        const phantom = this._phantom;
        const material = { surface: surface_red };
        return [{ phantom, material }];
    }
}

export class CutFactory extends AbstractCutFactory {
    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CuttingSolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { db, params } = this;

        const solid = db.lookup(this.solid);

        this.computePhantom();

        const results = c3d.ActionSolid.SolidCutting(solid, c3d.CopyMode.Copy, params);
        return [...results];
    }

    get params() {
        const { mode, names } = this;
        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);

        switch (mode.tag) {
            case 'contour':
                return new c3d.ShellCuttingParams(mode.placement, mode.contour, false, direction, flags, true, names);;
            case 'surface':
                const params = new c3d.ShellCuttingParams(mode.surface, false, flags, true, names);
                params.AddSurfaceProlongType(c3d.SurfaceProlongType.Extrusion);
                return params;
        }
    }
}

export class SplitFactory extends AbstractCutFactory {
    private _faces!: visual.Face[];
    private models!: c3d.Face[];
    get faces() { return this._faces; }
    set faces(faces: visual.Face[]) {
        this._faces = faces;
        const models = [];
        for (const face of faces) {
            models.push(this.db.lookupTopologyItem(face));
        }
        this.models = models;
        this.solid = faces[0].parentItem;
    }

    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CuttingSolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { db, mode, names, models } = this;

        const solid = db.lookup(this.solid);
        const flags = new c3d.MergingFlags(true, true);

        this.computePhantom();

        switch (mode.tag) {
            case 'contour':
                return c3d.ActionSolid.SplitSolid_async(solid, c3d.CopyMode.Copy, mode.placement, c3d.SenseValue.BOTH, [mode.contour], false, models, flags, names);
            case 'surface':
                return c3d.ActionSolid.SplitSolidBySpaceItem_async(solid, c3d.CopyMode.Copy, [mode.surface], false, models, flags, names);
        }
    }
}

export class CutAndSplitFactory extends GeometryFactory implements CutParams {
    private cut = new CutFactory(this.db, this.materials, this.signals);
    private split = new SplitFactory(this.db, this.materials, this.signals);

    get faces() { return this.split.faces ?? []; }
    set faces(faces: visual.Face[]) {
        if (faces.length > 0)
            this.split.faces = faces;
    }
    set solid(solid: visual.Solid) { this.cut.solid = solid; }

    set curve(curve: visual.SpaceInstance<visual.Curve3D>) { this.cut.curve = curve; this.split.curve = curve; }
    set plane(plane: visual.Face) { this.cut.plane = plane; this.split.plane = plane; }
    set mergingFaces(mergingFaces: boolean) { this.cut.mergingFaces = mergingFaces; this.split.mergingFaces = mergingFaces; }
    set mergingEdges(mergingEdges: boolean) { this.cut.mergingEdges = mergingEdges; this.split.mergingEdges = mergingEdges; }
    set constructionPlane(constructionPlane: PlaneSnap | undefined) { this.cut.constructionPlane = constructionPlane; this.split.constructionPlane = constructionPlane; }

    async calculate() {
        const { faces, cut, split } = this;
        if (faces.length === 0)
            return cut.calculate();
        else
            return [await split.calculate()];
    }

    get phantoms() {
        const { faces, cut, split } = this;
        if (faces.length === 0)
            return cut.phantoms;
        else
            return split.phantoms;
    }

    get originalItem() {
        const { faces, cut, split } = this;
        if (faces.length === 0)
            return cut.originalItem;
        else
            return split.originalItem;
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

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);