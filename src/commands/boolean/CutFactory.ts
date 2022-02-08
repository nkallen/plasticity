import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from "../../editor/snaps/Snap";
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, ContourAndPlacement, curve3d2curve2d, deunit, point2point, vec2vec } from '../../util/Conversion';
import { ExtrudeSurfaceFactory } from "../extrude/ExtrudeSurfaceFactory";
import { GeometryFactory, PhantomInfo, ValidationError } from '../../command/GeometryFactory';
import { ConstructionPlane } from "../../editor/snaps/ConstructionPlaneSnap";

export interface CutParams {
    mergingFaces: boolean;
    mergingEdges: boolean;
    constructionPlane?: ConstructionPlane;
    axes: ('X' | 'Y' | 'Z')[];
}

type CutMode = { tag: 'contour', contour: c3d.Contour, placement: c3d.Placement3D, info?: { Z: THREE.Vector3 } } | { tag: 'surface', surface: c3d.Surface } | { tag: 'axis', contour: c3d.Contour, placement: c3d.Placement3D, info?: { Z: THREE.Vector3 } }

type AxisName = 'X' | 'Y' | 'Z';

abstract class AbstractCutFactory extends GeometryFactory {
    constructionPlane?: PlaneSnap;
    mergingFaces = true;
    mergingEdges = true;
    protected mode!: CutMode;

    private fantom = new ExtrudeSurfaceFactory(this.db, this.materials, this.signals);
    protected abstract names: c3d.SNameMaker;

    private _solid!: visual.Solid;
    protected model!: c3d.Solid;
    get solid(): visual.Solid { return this._solid }
    set solid(solid: visual.Solid | c3d.Solid) {
        if (solid instanceof visual.Solid) {
            this.model = this.db.lookup(solid);
            this._solid = solid;
        } else {
            this.model = solid;
        }
    }

    set cutter(cutter: c3d.Surface | string | ContourAndPlacement) {
        if (cutter instanceof c3d.Surface) this.surface = cutter;
        else if (typeof cutter == "string") this.axis = cutter as AxisName;
        else this.curve = cutter;
    }

    set curve(inst: visual.SpaceInstance<visual.Curve3D> | ContourAndPlacement) {
        let curve2d, placement, curve3d;
        if (inst instanceof visual.SpaceInstance) {
            const instance = this.db.lookup(inst);
            const item = instance.GetSpaceItem()!;
            curve3d = item.Cast<c3d.Curve3D>(item.IsA());
            const planar = curve3d2curve2d(curve3d, this.constructionPlane?.placement ?? new c3d.Placement3D());
            if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
            curve2d = planar.curve;
            placement = planar.placement;
        } else {
            const planar = inst;
            curve2d = planar.curve;
            placement = planar.placement;
        }
        this.mode = { tag: 'contour', contour: new c3d.Contour([curve2d], true), placement };
    }

    set surface(surface: visual.Face | c3d.Surface) {
        if (surface instanceof visual.Face) {
            const model = this.db.lookupTopologyItem(surface);
            this.mode = { tag: 'surface', surface: model.GetSurface().GetSurface() }
        } else {
            this.mode = { tag: 'surface', surface }
        }
    }

    set axis(axis: AxisName) {
        const { contour, placement } = axis2contour_placement[axis];
        this.mode = { tag: 'contour', contour, placement }
    }

    protected computeInfo() {
        switch (this.mode.tag) {
            case 'axis':
            case 'contour':
                let { placement, contour } = this.mode;
                const bbox = new c3d.Cube();
                this.model.AddYourGabaritTo(bbox);
                const inout_max = bbox.pmax;
                const inout_min = bbox.pmin;
                placement.GetPointInto(inout_max);
                placement.GetPointInto(inout_min);

                if (contour.IsStraight() && this.mode.tag != 'axis') {
                    const limit1 = contour.GetLimitPoint(1), limit2 = contour.GetLimitPoint(2);

                    const parallelToY = Math.abs(limit1.y - limit2.y) < 10e-6;
                    const parallelToX = Math.abs(limit1.x - limit2.x) < 10e-6;
                    const outsideBBwrtY = (limit1.y <= inout_min.y + 10e-6 && limit1.y <= inout_max.y + 10e-6) || (limit1.y >= inout_min.y - 10e-6 && limit1.y >= inout_max.y - 10e-6);
                    const outsideBBwrtX = (limit1.x <= inout_min.x + 10e-6 && limit1.x <= inout_max.x + 10e-6) || (limit1.x >= inout_min.x - 10e-6 && limit1.x >= inout_max.x - 10e-6);

                    if (parallelToX && outsideBBwrtX) {
                        const curve3d = new c3d.PlaneCurve(placement, contour, true)
                        const { curve, placement: newPlacement } = curve3d2curve2d(curve3d, y_placement)!;
                        this.mode.contour = new c3d.Contour([curve], true);
                        this.mode.placement = newPlacement;
                    } else if (parallelToY && outsideBBwrtY) {
                        const curve3d = new c3d.PlaneCurve(placement, contour, true)
                        const { curve, placement: newPlacement } = curve3d2curve2d(curve3d, x_placement)!;
                        this.mode.contour = new c3d.Contour([curve], true);
                        this.mode.placement = newPlacement;
                    }
                }

                placement = this.mode.placement;
                const Z = vec2vec(placement.GetAxisZ(), 1);
                const { dPlus, dMinus } = c3d.Action.GetDistanceToCube(placement, this.model.GetShell()!);
                const d = Math.abs(dPlus) > Math.abs(dMinus) ? dPlus : dMinus;
                Z.multiplyScalar(deunit(d));
                this.mode.info = { Z };
        }
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const { mode, fantom } = this;
        const material = { surface: surface_red };

        switch (mode.tag) {
            case 'axis':
            case 'contour': {
                const { placement, contour } = mode;
                if (mode.info === undefined) this.computeInfo();
                const { Z } = mode.info!;

                fantom.model = new c3d.PlaneCurve(placement, contour, true);
                fantom.direction = Z;
                const phantom = await fantom.calculate();
                return [{ phantom, material }]
            }
            case 'surface': {
                const phantom = new c3d.SpaceInstance(mode.surface);
                return [{ phantom, material }]
            }
        }
    }

    get originalItem() { return this.solid }
}

export class CutFactory extends AbstractCutFactory {
    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CuttingSolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { params, model: solid } = this;

        const results = await c3d.ActionSolid.SolidCutting_async(solid, c3d.CopyMode.Copy, params);
        return [...results];
    }

    get params() {
        const { mode, names } = this;
        const flags = new c3d.MergingFlags(true, true);
        const direction = new c3d.Vector3D(0, 0, 0);

        switch (mode.tag) {
            case 'axis':
            case 'contour':
                if (mode.info === undefined) this.computeInfo();
                const result = new c3d.ShellCuttingParams(mode.placement, mode.contour, false, direction, flags, true, names);
                result.AddSurfaceProlongType(c3d.SurfaceProlongType.Contour);
                return result;
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
        const { mode, names, models: faces, model: solid } = this;

        const flags = new c3d.MergingFlags(true, true);

        switch (mode.tag) {
            case 'axis':
            case 'contour':
                return c3d.ActionSolid.SplitSolid_async(solid, c3d.CopyMode.Copy, mode.placement, c3d.SenseValue.BOTH, [mode.contour], false, faces, flags, names);
            case 'surface':
                return c3d.ActionSolid.SplitSolidBySpaceItem_async(solid, c3d.CopyMode.Copy, [mode.surface], false, faces, flags, names);
        }
    }
}

export class CutAndSplitFactory extends GeometryFactory {
    private cut = new CutFactory(this.db, this.materials, this.signals);
    private split = new SplitFactory(this.db, this.materials, this.signals);

    get faces() { return this.split.faces ?? []; }
    set faces(faces: visual.Face[]) {
        if (faces.length > 0) this.split.faces = faces;
    }
    set solid(solid: visual.Solid) { this.cut.solid = solid; }

    set curve(curve: visual.SpaceInstance<visual.Curve3D>) { this.cut.curve = curve; this.split.curve = curve; }
    set surface(plane: visual.Face) { this.cut.surface = plane; this.split.surface = plane; }
    set mergingFaces(mergingFaces: boolean) { this.cut.mergingFaces = mergingFaces; this.split.mergingFaces = mergingFaces; }
    set mergingEdges(mergingEdges: boolean) { this.cut.mergingEdges = mergingEdges; this.split.mergingEdges = mergingEdges; }
    set constructionPlane(constructionPlane: PlaneSnap | undefined) { this.cut.constructionPlane = constructionPlane; this.split.constructionPlane = constructionPlane; }

    async calculate() {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.calculate();
        else return [await split.calculate()];
    }

    calculatePhantoms(): Promise<PhantomInfo[]> {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.calculatePhantoms();
        else return split.calculatePhantoms();
    }

    get originalItem() {
        const { faces, cut, split } = this;
        if (faces.length === 0) return cut.originalItem;
        else return split.originalItem;
    }
}

export class MultiCutFactory extends GeometryFactory implements CutParams {
    mergingFaces = true;
    mergingEdges = true;
    constructionPlane?: ConstructionPlane | undefined;

    private _solids!: visual.Solid[];
    protected models!: c3d.Solid[];
    get solids(): visual.Solid[] { return this._solids }
    set solids(solids: Iterable<visual.Solid>) {
        const array = [...solids];
        this.models = array.map(solid => this.db.lookup(solid));
        this._solids = array;
    }

    private _surfaces: c3d.Surface[] = [];
    set surfaces(faces: visual.Face[]) {
        this._surfaces = faces.map(face => this.db.lookupTopologyItem(face).GetSurface().GetSurface());
        this._faces = faces;
    }

    private _faces: visual.Face[] = [];
    get faces() { return this._faces }

    private contours_placements: ContourAndPlacement[] = [];
    private _curves: visual.SpaceInstance<visual.Curve3D>[] = [];
    get curves() { return this._curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        const result = [];
        for (const inst of curves) {
            const instance = this.db.lookup(inst);
            const item = instance.GetSpaceItem()!;
            const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
            // TODO: need more tests.
            // We want to find a cut that will work for the user.
            // The current construction plane takes precendence. After that, the plane associated with the curve. Finally, the global XYZ planes.
            let planar = curve3d2curve2d(curve3d, this.constructionPlane?.placement);
            if (planar === undefined) planar = curve3d2curve2d(curve3d);
            if (planar === undefined) planar = curve3d2curve2d(curve3d, new c3d.Placement3D());
            if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
            result.push(planar);
        }
        this.contours_placements = result;
    }

    private _axes: ('X' | 'Y' | 'Z')[] = [];
    set axes(axes: ('X' | 'Y' | 'Z')[]) {
        this._axes = axes;
    }

    async calculate() {
        const { _surfaces: surfaces, contours_placements: curves, models: solids, _axes: axes } = this;
        if (solids.length === 0) return [];

        const cutters = [...surfaces, ...curves, ...axes];
        let parts: c3d.Solid[] = solids;
        for (const cutter of cutters) {
            let pass: Promise<c3d.Solid[]>[] = [];
            for (const part of parts) {
                const cut = new CutFactory(this.db, this.materials, this.signals);
                cut.solid = part;
                cut.cutter = cutter;
                const promise = cut.calculate().catch(e => [part]);
                pass.push(promise);
            }
            parts = (await Promise.all(pass)).flat();
        }
        return parts;
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const { _surfaces: surfaces, contours_placements: curves, models: solids, _axes: axes } = this;
        if (solids.length === 0) return [];
        const cutters = [...surfaces, ...curves, ...axes];

        const first = solids[0];
        const promises = [];
        for (const cutter of cutters) {
            const cut = new CutFactory(this.db, this.materials, this.signals);
            cut.solid = first;
            cut.cutter = cutter;
            promises.push(cut.calculatePhantoms());
        }
        return (await Promise.all(promises)).flat();
    }

    protected get originalItem() {
        return this.solids;
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

const { x_placement, y_placement, z_placement } = (() => {
    const org = new c3d.CartPoint3D(0, 0, 0);
    const X = new c3d.Vector3D(1, 0, 0);
    const Y = new c3d.Vector3D(0, 1, 0);
    const Z = new c3d.Vector3D(0, 0, 1);

    const x_placement = new c3d.Placement3D(org, X, false);
    const y_placement = new c3d.Placement3D(org, Y, false);
    const z_placement = new c3d.Placement3D(org, Z, false);
    return { x_placement, y_placement, z_placement, };
})();

const axis2contour_placement: Record<'X' | 'Y' | 'Z', { contour: c3d.Contour, placement: c3d.Placement3D }> = (() => {
    const line_x = new c3d.LineSegment(new c3d.CartPoint(-1000, 0), new c3d.CartPoint(1000, 0));
    const contour_x = new c3d.Contour([line_x], false);
    const line_y = new c3d.LineSegment(new c3d.CartPoint(0, -1000), new c3d.CartPoint(0, 1000));
    const contour_y = new c3d.Contour([line_y], false);

    return {
        'X': { contour: contour_y, placement: z_placement },
        'Y': { contour: contour_x, placement: z_placement },
        'Z': { contour: contour_x, placement: x_placement },
    }
})();