import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase, TemporaryObject } from '../../GeometryDatabase';
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryFactory } from '../Factory';
import * as visual from '../../../src/VisualModel';

export default class ContourFactory extends GeometryFactory {
    readonly curves = new Array<visual.SpaceInstance<visual.Curve3D>>();
    private temp?: TemporaryObject;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
    }

    async doUpdate() {
        const { curves } = this;

        if (this.curves.length === 0) return;

        const firstCurve = this.db.lookup(this.curves[0]).GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const contour = c3d.ActionCurve3D.CreateContour(firstCurve);
        for (const curve of curves.slice(1)) {
            const nextCurve = this.db.lookup(curve).GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            c3d.ActionCurve3D.AddCurveToContour(nextCurve, contour, true);
        }
        const temp = await this.db.addTemporaryItem(new c3d.SpaceInstance(contour));
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit(): Promise<visual.SpaceInstance<visual.Curve3D>> {
        const { curves } = this;

        if (this.curves.length === 0) throw new Error("not enough curves");

        const firstCurve = this.db.lookup(this.curves[0]).GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const contour = c3d.ActionCurve3D.CreateContour(firstCurve);
        for (const curve of curves.slice(1)) {
            const nextCurve = this.db.lookup(curve).GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            c3d.ActionCurve3D.AddCurveToContour(nextCurve, contour, true);
        }
        const result = await this.db.addItem(new c3d.SpaceInstance(contour)) as visual.SpaceInstance<visual.Curve3D>;
        return result;
    }

    doCancel() {
        this.temp?.cancel();
    }
}