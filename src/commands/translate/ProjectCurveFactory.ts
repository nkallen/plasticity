import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve, point2point, vec2vec } from "../../util/Conversion";
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import { BasicScaleFactory, X, Y, Z, FreestyleScaleFactory } from "./TranslateFactory";

/**
 * Scaling a curve to zero is the same as projecting onto a plane. Projecting onto a plane is a special,
 * higher fidelity operation than scaling in the geometry kernel. So it's to be preferred.
 */

export class ProjectCurveFactory extends GeometryFactory {
    origin!: THREE.Vector3;
    normal!: THREE.Vector3;
    private _curves!: c3d.Curve3D[];
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        const result = [];
        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            result.push(inst2curve(inst)!);
        }
        this._curves = result;
    }

    async calculate() {
        const { origin, normal, _curves: curves } = this;
        const result = [];
        for (const curve of curves) {
            const placement = new c3d.Placement3D(point2point(origin), vec2vec(normal), false);
            const projected = curve.GetProjection(placement);
            if (projected === null)
                throw new ValidationError();
            const planar = new c3d.PlaneCurve(placement, projected, true);
            result.push(new c3d.SpaceInstance(planar));
        }
        return result;
    }
}
function partition(items: visual.Item[]): [visual.SpaceInstance<visual.Curve3D>[], visual.Item[]] {
    const curves = items.filter(i => i instanceof visual.SpaceInstance) as visual.SpaceInstance<visual.Curve3D>[];
    const nonCurves = items.filter(i => !(i instanceof visual.SpaceInstance)) as visual.Item[];
    return [curves, nonCurves];
}

export class ProjectingBasicScaleFactory extends BasicScaleFactory {
    private project = new ProjectCurveFactory(this.db, this.materials, this.signals);
    private basic = new BasicScaleFactory(this.db, this.materials, this.signals);

    get items() { return this._items; }
    set items(items: visual.Item[]) {
        super.items = items;
        const [curves, nonCurves] = partition(items);
        this.project.curves = curves;
        this.basic.items = nonCurves;
    }

    async calculate() {
        const { scale, project, pivot, basic } = this;
        const x = scale.x === 0;
        const y = scale.y === 0;
        const z = scale.z === 0;
        if (x || y || z) {
            project.origin = pivot;
            if (x) project.normal = X;
            if (y) project.normal = Y;
            if (z) project.normal = Z;
            const promises = [];
            promises.push(project.calculate());
            if (basic.items.length > 0)
                promises.push(basic.calculate());
            const [curves, rest] = await Promise.all(promises);
            return [...curves, ...(rest ?? [])];
        } else {
            return super.calculate();
        }
    }
}

export class ProjectingFreestyleScaleFactory extends FreestyleScaleFactory {
    private project = new ProjectCurveFactory(this.db, this.materials, this.signals);
    private freestyle = new FreestyleScaleFactory(this.db, this.materials, this.signals);

    get items() { return this._items; }
    set items(items: visual.Item[]) {
        super.items = items;
        const [curves, nonCurves] = partition(items);
        this.project.curves = curves;
        this.freestyle.items = nonCurves;
    }

    async calculate() {
        const { scale, project, pivot, freestyle } = this;
        const x = scale.x === 0;
        const y = scale.y === 0;
        const z = scale.z === 0;
        if (x || y || z) {
            project.origin = pivot;
            project.normal = this.ref;
            const promises = [];
            promises.push(project.calculate());
            if (freestyle.items.length > 0)
                promises.push(freestyle.calculate());
            const [curves, rest] = await Promise.all(promises);
            return [...curves, ...(rest ?? [])];
        } else {
            return super.calculate();
        }
    }
}
