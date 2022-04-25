import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point, unit, vec2vec } from '../../util/Conversion';
import { SweepFactory, SweptParams } from "./SweepFactory";

export interface RevolutionParams extends SweptParams {
    origin: THREE.Vector3;
    axis: THREE.Vector3;

    side1: number;
    side2: number;

    shape: Shape;
}

export enum Shape { Torus = 0, Sphere = 1 }

export class RevolutionFactory extends SweepFactory implements RevolutionParams {
    origin!: THREE.Vector3;
    axis!: THREE.Vector3;

    side1 = 2 * Math.PI;
    side2 = 0;
    shape = Shape.Torus;

    async calculate() {
        const { origin, axis: direction, contours2d, curves3d, names, thickness1, thickness2, surface, side1: scalarValue1, side2: scalarValue2, shape } = this;

        const sweptData = contours2d.length > 0
            ? new c3d.SweptData(surface, contours2d)
            : new c3d.SweptData(curves3d[0]);

        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];

        const axis = new c3d.Axis3D(point2point(origin), vec2vec(direction, 1));
        const params = new c3d.RevolutionValues();
        params.shellClosed = true;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);
        params.shape = shape;

        const { side1, side2 } = params;
        side1.way = c3d.SweptWay.scalarValue;
        side1.scalarValue = scalarValue1;

        side2.way = c3d.SweptWay.scalarValue;
        side2.scalarValue = scalarValue2;
        params.side1 = side1;
        params.side2 = side2;

        return c3d.ActionSolid.RevolutionSolid_async(sweptData, axis, params, names, ns);
    }
}