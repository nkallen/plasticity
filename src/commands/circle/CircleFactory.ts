import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { PlaneSnap } from "../../SnapManager";
import { GeometryFactory } from '../Factory';

export enum Mode { Horizontal, Vertical }

export default class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    point!: THREE.Vector3;
    constructionPlane = new PlaneSnap()
    mode = Mode.Horizontal;

    get radius() { return this.point.distanceTo(this.center) }
    set radius(r: number) { this.point = this.center.clone().add(new THREE.Vector3(r, 0, 0)) }

    toggleMode() {
        this.mode = this.mode === Mode.Vertical ? Mode.Horizontal : Mode.Vertical;
    }

    protected async computeGeometry() {
        const { mode, center, radius, point, constructionPlane: { n } } = this;

        const Y = point.clone().sub(center).normalize();

        const placement = new c3d.Placement3D();
        const k = n.clone().cross(Y);
        if (mode === Mode.Vertical) {
            placement.SetAxisX(new c3d.Vector3D(n.x, n.y, n.z));
            placement.SetAxisY(new c3d.Vector3D(Y.x, Y.y, Y.z));
            placement.SetAxisZ(new c3d.Vector3D(k.x, k.y, k.z));
        } else {
            placement.SetAxisX(new c3d.Vector3D(Y.x, Y.y, Y.z));
            placement.SetAxisY(new c3d.Vector3D(k.x, k.y, k.z));
            placement.SetAxisZ(new c3d.Vector3D(n.x, n.y, n.z));
        }
        placement.Reset();
        placement.SetOrigin(new c3d.CartPoint3D(center.x, center.y, center.z));

        const circle = new c3d.Arc3D(placement, radius, radius, 0);

        return new c3d.SpaceInstance(circle);
    }
}