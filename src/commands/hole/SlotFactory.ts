import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { derive } from "../../command/FactoryBuilder";
import { GeometryFactory, ValidationError } from "../../command/GeometryFactory";
import { composeMainName, point2point, unit, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';

export interface HoleParams {
    placeAngle: number;
    azimuthAngle: number;
}

export interface SlotParams extends HoleParams {
    width: number;
    depth: number;
    floorRadius: number;
    tailAngle: number;
    tailAngleDegrees: number;
    bottomWidth: number;
    bottomDepth: number;
    type: c3d.SlotType;
    orientation: THREE.Quaternion;
}

abstract class HoleFactory extends GeometryFactory implements HoleParams {
    placeAngle = 0;
    azimuthAngle = 0;

    protected _solid!: { view: visual.Solid, model: c3d.Solid };
    @derive(visual.Solid) get solid(): visual.Solid { throw '' }
    set solid(solid: visual.Solid | c3d.Solid) { }

    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.HoleSolid, this.db.version), c3d.ESides.SideNone, 0);

    abstract get params(): { params: c3d.HoleValues, placement: c3d.Placement3D };

    async calculate() {
        const { _solid: { model: solid }, params: { params, placement }, names } = this;
        const result = c3d.ActionSolid.HoleSolid(solid, c3d.CopyMode.Copy, placement, params, names);
        if (result === null) throw new ValidationError();
        return result;
    }

    protected get originalItem() {
        return this.solid;
    }
}

export class SlotFactory extends HoleFactory implements SlotParams {
    private _face!: { view: visual.Face, model: c3d.Face };
    @derive(visual.Face) get face(): visual.Face { throw '' }
    set face(face: visual.Face | c3d.Face) { }

    p1!: THREE.Vector3;
    p2!: THREE.Vector3;

    width = 0.5;
    depth = 0.1;
    floorRadius = 0.5;
    tailAngle = 1;
    bottomWidth = 0.5;
    bottomDepth = 0.5;
    type = c3d.SlotType.Rectangular;
    orientation!: THREE.Quaternion;

    get tailAngleDegrees() { return THREE.MathUtils.radToDeg(this.tailAngle) }
    set tailAngleDegrees(degrees: number) {
        this.tailAngle = THREE.MathUtils.degToRad(degrees);
    }


    private readonly midpoint = new THREE.Vector3();
    private readonly y = new THREE.Vector3();
    private readonly z = new THREE.Vector3();
    get params(): { params: c3d.SlotValues, placement: c3d.Placement3D } {
        const { _solid: { model: solid }, _face: { model: face }, p1, p2 } = this;
        const { width, depth, floorRadius, tailAngle, bottomWidth, bottomDepth, orientation, type } = this;
        const { midpoint, y, z } = this;

        z.set(0, 0, 1).applyQuaternion(orientation).normalize();
        midpoint.copy(p1);
        y.subVectors(p2, p1).normalize();
        const placement = new c3d.Placement3D();
        placement.InitYZ(point2point(p1), vec2vec(y, 1), vec2vec(z, 1));

        const params = new c3d.SlotValues();
        params.length = unit(p1.distanceTo(p2) * 2);
        params.width = unit(width);
        params.depth = unit(depth);
        params.floorRadius = unit(floorRadius);
        params.tailAngle = tailAngle;
        params.bottomWidth = unit(bottomWidth);
        params.bottomDepth = unit(bottomDepth);
        params.type = type;
        params.SetSurface(face.GetSurface().GetSurface());

        return { params, placement }
    }
}