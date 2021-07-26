import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { cart2vec, vec2cart } from "../../util/Conversion";
import { GeometryFactory } from '../Factory';

abstract class ControlPointFactory extends GeometryFactory {
    curve!: c3d.PolyCurve3D;

    _instance!: visual.SpaceInstance<visual.Curve3D>;
    get instance() { return this._instance }
    set instance(i: visual.SpaceInstance<visual.Curve3D>) {
        let model = this.db.lookup(i);
        model = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const item = model.GetSpaceItem()!;
        const curve = item.Cast<c3d.PolyCurve3D>(item.IsA());
        this.curve = curve;
        this._instance = i;
    }

    get originalItem() {
        return this.instance
    }
}

export class ChangePointFactory extends ControlPointFactory {
    readonly originalPosition = new THREE.Vector3();
    delta!: THREE.Vector3;
    private newPosition = new THREE.Vector3();

    get instance() { return super.instance }
    set instance(i: visual.SpaceInstance<visual.Curve3D>) {
        super.instance = i;

        if (this.controlPoint !== undefined)
            this.originalPosition.copy(cart2vec(this.curve.GetPoints()[this.controlPoint.index]));
    }

    _controlPoint!: visual.ControlPoint;
    get controlPoint() { return this._controlPoint }
    set controlPoint(point: visual.ControlPoint) {
        this._controlPoint = point;
        if (this.curve !== undefined)
            this.originalPosition.copy(cart2vec(this.curve.GetPoints()[this.controlPoint.index]));
    }

    async computeGeometry() {
        const { originalPosition, controlPoint: { index }, delta, curve, newPosition } = this;
        newPosition.copy(originalPosition).add(delta);

        curve.ChangePoint(index, vec2cart(newPosition));
        curve.Rebuild();

        return new c3d.SpaceInstance(curve);
    }

}

export class RemovePointFactory extends ControlPointFactory {
    controlPoint!: visual.ControlPoint;

    async computeGeometry() {
        const { controlPoint: { index }, curve} = this;
        curve.RemovePoint(index);
        return new c3d.SpaceInstance(curve);
    }
}