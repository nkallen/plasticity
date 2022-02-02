import c3d from '../../../build/Release/c3d.node';
import { derive } from "../../command/FactoryBuilder";
import { GeometryDatabase } from '../../editor/GeometryDatabase';
import { composeMainName, unit } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { SweepFactory, SweptParams } from "./RevolutionFactory";

export interface EvolutionParams extends SweptParams {
    mode: Mode;
}

export enum Mode { Parallel = -1, PreserveAngle = 1, Orthogonal = 2, Normal = 4 }

export class EvolutionFactory extends SweepFactory implements EvolutionParams {
    mode = Mode.PreserveAngle;

    protected _spine!: { view: visual.SpaceInstance<visual.Curve3D>, model: c3d.Curve3D };
    @derive(visual.Curve3D) get spine(): visual.SpaceInstance<visual.Curve3D> { throw '' }
    set spine(spine: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D) { }


    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveEvolutionSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected surface!: c3d.Surface;
    protected contours2d: c3d.Contour[] = [];

    async calculate() {
        const { _spine: { model: spine }, contours2d, names, thickness1, thickness2, mode, surface } = this;
        const cs = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const ns = new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0);

        const sweptData = new c3d.SweptData(surface, contours2d);
        const params = new c3d.EvolutionValues();
        params.shellClosed = true;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);
        switch (mode) {
            case Mode.Parallel:
                params.SetParallel();
                break;
            case Mode.PreserveAngle:
                params.SetKeepingAngle();
                break;
            case Mode.Orthogonal:
                params.SetOrthogonal();
                break;
        }

        return c3d.ActionSolid.EvolutionSolid_async(sweptData, spine, params, names, cs, ns);
    }
}


