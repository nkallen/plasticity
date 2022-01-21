import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { deunit, point2point, unit, vec2vec } from "../../util/Conversion";
import * as visual from "../../visual_model/VisualModel";

export enum Mode { Horizontal, Vertical }

export class CenterCircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    point!: THREE.Vector3;
    orientation = new THREE.Quaternion()
    mode = Mode.Horizontal;

    get radius() {
        return this.point.distanceTo(this.center)
    }
    set radius(r: number) { this.point = this.center.clone().add(new THREE.Vector3(r, 0, 0)) }

    toggleMode() {
        this.mode = this.mode === Mode.Vertical ? Mode.Horizontal : Mode.Vertical;
    }

    async calculate() {
        const { mode, center, radius, point, normal } = this;

        const Y = point.clone().sub(center).normalize();

        const [x, y, z] = CenterCircleFactory.orientHorizontalOrVertical(point, center, normal, mode);
        const placement = new c3d.Placement3D();
        placement.SetAxisX(vec2vec(x, 1));
        placement.SetAxisY(vec2vec(y, 1));
        placement.SetAxisZ(vec2vec(z, 1));
        placement.Reset();
        placement.SetOrigin(point2point(center));

        const circle = new c3d.Arc3D(placement, unit(radius), unit(radius), 0);

        return new c3d.SpaceInstance(circle);
    }

    private readonly _normal = new THREE.Vector3();
    private get normal() {
        return this._normal.copy(Z).applyQuaternion(this.orientation);
    }

    private static localY = new THREE.Vector3();
    private static localZ = new THREE.Vector3();
    static orientHorizontalOrVertical(p1: THREE.Vector3, p2: THREE.Vector3, n: THREE.Vector3, mode: Mode) {
        const { localY, localZ } = this;

        localY.copy(p1).sub(p2).normalize();
        localZ.copy(n).cross(localY);

        if (mode === Mode.Vertical) {
            return [n, localY, localZ];
        } else {
            return [localY, localZ, n];
        }
    }
}

const Z = new THREE.Vector3(0, 0, 1);

export class TwoPointCircleFactory extends CenterCircleFactory {
    p1!: THREE.Vector3
    private radial = new THREE.Vector3();

    set p2(point: THREE.Vector3) {
        const { p1, radial } = this;
        this.point = point;
        radial.copy(point).sub(p1).multiplyScalar(0.5);
        this.center = new THREE.Vector3().copy(p1).add(radial);
    }
}

export class ThreePointCircleFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;

    async calculate() {
        const { p1, p2, p3 } = this;

        const circle = new c3d.Arc3D(point2point(p1), point2point(p2), point2point(p3), 1, true);

        return new c3d.SpaceInstance(circle);
    }
}

export interface EditCircleParams {
    radius: number;
}

export class EditCircleFactory extends GeometryFactory implements EditCircleParams {
    private arc!: c3d.Arc3D;

    private _radius?: number;
    get radius() {
        return this._radius ?? deunit(this.arc.GetRadius());
    }

    set radius(radius: number) {
        this._radius = radius;
    }

    private _circle!: visual.SpaceInstance<visual.Curve3D>
    set circle(circle: visual.SpaceInstance<visual.Curve3D>) {
        this._circle = circle;
        let model = this.db.lookup(circle);
        model = model.Duplicate().Cast<c3d.SpaceInstance>(c3d.SpaceType.SpaceInstance);
        const item = model.GetSpaceItem()!;
        const arc = item.Cast<c3d.Arc3D>(item.IsA());
        this.arc = arc;
    }

    async calculate() {
        const { arc, radius } = this;
        arc.SetRadius(unit(radius));
        return new c3d.SpaceInstance(arc);
    }

    get originalItem() {
        return this._circle;
    }
}