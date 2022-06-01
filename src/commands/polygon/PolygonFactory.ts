import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { GeometryFactory } from '../../command/GeometryFactory';
import { point2point, vec2vec } from "../../util/Conversion";
import { CenterCircleFactory, Mode } from "../circle/CircleFactory";
import { Z } from "../../util/Constants";

export class PolygonFactory extends GeometryFactory {
    mode = Mode.Horizontal;
    toggleMode() {
        this.mode = this.mode === Mode.Vertical ? Mode.Horizontal : Mode.Vertical;
    }
    
    center!: THREE.Vector3;
    p2!: THREE.Vector3;
    private _vertexCount = 5;
    orientation = new THREE.Quaternion();

    get vertexCount() { return this._vertexCount }
    set vertexCount(count: number) {
        this._vertexCount = Math.max(0, count);
    }

    async calculate() {
        const { center, p2, vertexCount, normal } = this;
        const [,,z] = CenterCircleFactory.orientHorizontalOrVertical(this.p2, this.center, normal, this.mode);
        const polygon = c3d.ActionCurve3D.RegularPolygon(point2point(center), point2point(p2), vec2vec(z, 1), vertexCount, false);

        return new c3d.SpaceInstance(polygon);
    }

    private readonly _normal = new THREE.Vector3();
    private get normal() {
        return this._normal.copy(Z).applyQuaternion(this.orientation);
    }
}
