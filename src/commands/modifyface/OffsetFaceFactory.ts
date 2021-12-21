import * as THREE from 'three';
import c3d from '../../../build/Release/c3d.node';
import { composeMainName, vec2vec } from '../../util/Conversion';
import { GeometryFactory, NoOpError, ValidationError } from '../../command/GeometryFactory';
import { ThickFaceFactory } from '../thin-solid/ThinSolidFactory';
import { ModifyFaceFactory } from './ModifyFaceFactory';
import * as visual from "../../visual_model/VisualModel";

export interface OffsetFaceParams {
    distance: number;
    angle: number;
    faces: visual.Face[];
}

export class OffsetFaceFactory extends ModifyFaceFactory implements OffsetFaceParams {
    angle = 0;
    operationType = c3d.ModifyingType.Offset;
    get distance() { return this.direction.x }
    set distance(d: number) { this.direction = new THREE.Vector3(d, 0, 0) }

    async calculate() {
        const { solidModel, facesModel, direction, angle } = this;

        let solid = solidModel;

        let transformed = false;
        if (direction.manhattanLength() > 0) {
            const params = new c3d.ModifyValues();
            params.way = c3d.ModifyingType.Offset;
            params.direction = vec2vec(direction);
            solid = await c3d.ActionDirect.FaceModifiedSolid_async(solid, c3d.CopyMode.Copy, params, facesModel, this.names);
            transformed = true;
        }
        if (angle !== 0) {
            const reference = facesModel[0];

            const collector = new FaceCollector(solidModel, reference);
            const { smoothlyJoinedFaces, slopes } = collector;
            const placement = collector.placement(false);

            const creators = [];
            for (let i = 0, l = solid.GetCreatorsCount(); i < l; i++) {
                const creator = solid.GetCreator(i)!;
                creators.push(creator);
            }

            if (smoothlyJoinedFaces.length > 0) {
                const params = new c3d.ModifyValues();
                params.way = c3d.ModifyingType.Purify;
                const names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.FaceModifiedSolid, this.db.version), c3d.ESides.SideNone, 0);
                solid = c3d.ActionDirect.FaceModifiedSolid(solid, c3d.CopyMode.Copy, params, smoothlyJoinedFaces, names);
            }

            const names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.DraftSolid, this.db.version), c3d.ESides.SideNone, 0);
            solid = await c3d.ActionSolid.DraftSolid_async(solid, c3d.CopyMode.Copy, placement, angle, slopes, c3d.FacePropagation.All, false, names);
            transformed = true;

            {
                const shell = solid.GetShell()!;
                for (const creator of creators) {
                    if (creator.IsA() === c3d.CreatorType.FilletSolid) {
                        const { success } = creator.CreateShell(shell, c3d.CopyMode.Same);
                        if (success) {
                            solid.AddCreator(creator, true);
                        }
                    }
                }
            }

        }
        if (transformed) return solid;
        else throw new NoOpError();
    }
}

export class FooFactory extends GeometryFactory implements OffsetFaceParams {
    private readonly offset = new OffsetFaceFactory(this.db, this.materials, this.signals);
    private readonly thicken = new ThickFaceFactory(this.db, this.materials, this.signals);

    get solid() { return this.offset.solid }
    set solid(solid: visual.Solid) {
        this.offset.solid = solid;
        this.thicken.solid = solid;
    }

    get faces() { return this.offset.faces }
    set faces(faces: visual.Face[]) {
        this.offset.faces = faces;
        this.thicken.faces = faces;
    }

    get distance() { return this.offset.distance }
    set distance(distance: number) {
        this.offset.distance = distance;
        this.thicken.thickness1 = distance;
    }

    get angle() { return this.offset.angle }
    set angle(angle: number) {
        this.offset.angle = angle;
    }

    async calculate() {
        try {
            const result = await this.offset.calculate();
            return result;
        } catch (e) {
            const error = e as any;
            if (error.isC3dError) {
                return this.thicken.calculate();
            } else throw new ValidationError();
        }
    }

    get originalItem() { return this.offset.originalItem }
}

export class FaceCollector {
    private readonly _smoothlyJoinedFaces: c3d.Face[];
    private readonly _slopes: c3d.Face[];

    get smoothlyJoinedFaces(): c3d.Face[] { return this._smoothlyJoinedFaces }
    get slopes(): c3d.Face[] { return this._slopes }

    constructor(private readonly solid: c3d.Solid, private readonly reference: c3d.Face) {
        // From the reference face, find smoothly faces (which may be fillets), and non-smoothly joined, which we want to slope
        const smoothlyJoinedFaces = new Map<bigint, c3d.Face>();
        const slopes = [];

        const outers = reference.GetOuterEdges();
        for (const outer of outers) {
            const plus = outer.GetFacePlus()!;
            const minus = outer.GetFaceMinus()!;
            const face = plus.Id() === reference.Id() ? minus : plus;
            if (outer.IsSmooth()) {
                smoothlyJoinedFaces.set(face.Id(), face);
            } else {
                slopes.push(face);
            }
        }

        // Walk neighbors of smoothly joined faces, (they are also slope candidates)
        for (const face of smoothlyJoinedFaces.values()) {
            const outers = face.GetNeighborFaces();
            for (const outer of outers) {
                if (outer.GetNameHash() === reference.GetNameHash()) continue;
                slopes.push(outer);
            }
        }

        // Finally, of all the slope candidates, add in any additional smoothly joined faces
        for (const slope of slopes) {
            const outers = slope.GetOuterEdges();
            for (const outer of outers) {
                if (outer.IsSmooth() && !outer.IsSeam()) {
                    const plus = outer.GetFacePlus()!;
                    const minus = outer.GetFaceMinus()!;
                    const face = plus.Id() === slope.Id() ? minus : plus;
                    smoothlyJoinedFaces.set(face.Id(), face);
                }
            }
        }

        this._smoothlyJoinedFaces = [...smoothlyJoinedFaces.values()];
        this._slopes = slopes;
    }

    placement(top: boolean): c3d.Placement3D {
        const { reference, slopes } = this;
        const placement = reference.GetSurfacePlacement(); // world coordinates with Z along normal
        if (top) return placement;

        const control = reference.GetControlPlacement(); // Y is normal
        const bbox = new c3d.Cube();
        for (const face of slopes) face.AddYourGabaritTo(bbox);
        const rect = bbox.ProjectionRect(control); // convert bbox world coordinates into normal coordinates

        const v = control.GetVectorFrom(rect.GetLeft(), 0, 0, c3d.LocalSystemType3D.CartesianSystem);
        placement.Move(v);
        return placement;
    }
}