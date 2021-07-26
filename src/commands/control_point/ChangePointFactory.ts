import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { cart2vec, vec2cart } from "../../util/Conversion";
import { GeometryFactory } from '../Factory';

export default class ChangePointFactory extends GeometryFactory {
    readonly originalPosition = new THREE.Vector3();
    private _controlPoint!: visual.ControlPoint;
    curve!: c3d.PolyCurve3D;
    delta!: THREE.Vector3;
    private _instance!: visual.SpaceInstance<visual.Curve3D>;

    private newPosition = new THREE.Vector3();

    get instance() { return this._instance }
    set instance(i: visual.SpaceInstance<visual.Curve3D>) {
        let model = this.db.lookup(i);
        // FIXME verify undo works and that this is a deep dup
        model = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const item = model.GetSpaceItem();
        if (item === null) throw new Error("invalid precondtion");
        const curve = item.Cast<c3d.PolyCurve3D>(item.IsA());
        this.curve = curve;
        this._instance = i;

        if (this.controlPoint !== undefined)
            this.originalPosition.copy(cart2vec(this.curve.GetPoints()[this.controlPoint.index]));
    }

    get controlPoint() { return this._controlPoint }
    set controlPoint(point: visual.ControlPoint) {
        this._controlPoint = point;
        if (this.curve !== undefined)
            this.originalPosition.copy(cart2vec(this.curve.GetPoints()[this._controlPoint.index]));
    }

    async computeGeometry() {
        const { originalPosition, controlPoint: { index }, delta, curve, newPosition } = this;
        newPosition.copy(originalPosition).add(delta);

        curve.ChangePoint(index, vec2cart(newPosition));

        return new c3d.SpaceInstance(curve);
    }

    get originalItem() { return this.instance }
}