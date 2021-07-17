import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class MirrorFactory extends GeometryFactory {
    curve!: visual.SpaceInstance<visual.Curve3D>;
    origin!: THREE.Vector3;
    normal!: THREE.Vector3;

    async computeGeometry() {
        const { origin, normal } = this;
        const model = this.db.lookup(this.curve);
        const transformed = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const mat = new c3d.Matrix3D();
        mat.Symmetry(new c3d.CartPoint3D(origin.x, origin.y, origin.z), new c3d.Vector3D(normal.x, normal.y, normal.z));
        transformed.Transform(mat);

        return transformed;
    }
}