import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class JoinCurvesFactory extends GeometryFactory {
    readonly curves = new Array<visual.SpaceInstance<visual.Curve3D>>();

    async doUpdate() {
    }

    async doCommit(): Promise<visual.SpaceInstance<visual.Curve3D>[]> {
        if (this.curves.length === 0) throw new Error("not enough curves");

        const curves = [];
        for (const curve of this.curves) {
            curves.push(this.db.lookup(curve).GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));
        }
        const contours = c3d.ActionCurve3D.CreateContours(curves, 10);
        const result = [];
        for (const [i, contour] of contours.entries()) {
            const p = this.db.addItem(new c3d.SpaceInstance(contour)) as Promise<visual.SpaceInstance<visual.Curve3D>>;
            result.push(p);
        }
        return Promise.all(result).then(x => { this.curves.forEach(c => this.db.removeItem(c)); return x });
    }

    doCancel() {
    }
}