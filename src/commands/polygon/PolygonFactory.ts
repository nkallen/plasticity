import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { point2point, vec2vec } from "../../util/Conversion";
import { CenterCircleFactory, Mode } from "../circle/CircleFactory";

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

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);