import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export interface CharacterCurveParams {
    tMin: number;
    tMax: number;
    argument: string;
    xFunction: string;
    yFunction: string;
    zFunction: string;
}

export default class CharacterCurveFactory extends GeometryFactory {
    tMin = 0;
    tMax = Math.PI*2;
    argument = "t";
    xFunction = "sin(t)";
    yFunction = "t";
    zFunction = "2";

    async computeGeometry() {
        const { tMin, tMax, argument, xFunction, yFunction, zFunction } = this;

        const ff = new c3d.FunctionFactory();
        const x = ff.CreateAnalyticalFunction(xFunction, argument, tMin, tMax);
        const y = ff.CreateAnalyticalFunction(yFunction, argument, tMin, tMax);
        const z = ff.CreateAnalyticalFunction(zFunction, argument, tMin, tMax);

        if (x === null || y === null || z === null) throw new Error("invalid");

        const placement = new c3d.Placement3D();
        const curve = new c3d.CharacterCurve3D(x, y, z, c3d.LocalSystemType3D.CartesianSystem, placement, tMin, tMax);
        return new c3d.SpaceInstance(curve);
    }
}
