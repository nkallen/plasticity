import { vec2cart } from "../../util/Conversion";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
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
        model = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const item = model.GetSpaceItem();
        if (item === null || item.Type() !== c3d.SpaceType.PolyCurve3D) throw new Error("invalid precondtion");
        const curve = item.Cast<c3d.PolyCurve3D>(item.IsA());
        this.curve = curve;
        this._instance = i;
    }

    get controlPoint() { return this._controlPoint }
    set controlPoint(point: visual.ControlPoint) {
        this.originalPosition.copy(point.position);
        this._controlPoint = point;
    }

    async computeGeometry() {
        const { originalPosition, newPosition, controlPoint, delta, curve } = this;
        this.newPosition.copy(originalPosition).add(delta);

        curve.ChangePoint(controlPoint.index, vec2cart(this.newPosition))

        return new c3d.SpaceInstance(curve);
    }

    get originalItem() { return this.instance }
}