import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, GizmoLike, mode } from "../AbstractGizmo";
import { AngleGizmo, DistanceGizmo, LengthGizmo } from "../MiniGizmos";
import { ExtrudeParams } from "./ExtrudeFactory";

export class ExtrudeGizmo implements GizmoLike<(params: ExtrudeParams) => void> {
    private readonly race1Gizmo = new AngleGizmo("extrude:race1", this.editor);
    private readonly distance1Gizmo = new DistanceGizmo("extrude:distance1", this.editor);
    private readonly race2Gizmo = new AngleGizmo("extrude:race2", this.editor);
    private readonly distance2Gizmo = new DistanceGizmo("extrude:distance2", this.editor);
    private readonly thicknessGizmo = new LengthGizmo("extrude:thickness", this.editor);

    constructor(private readonly params: ExtrudeParams, private readonly editor: EditorLike) {
    }

    execute(cb: (params: ExtrudeParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { race1Gizmo, distance1Gizmo, race2Gizmo, distance2Gizmo, thicknessGizmo, params } = this;

        distance1Gizmo.position.copy(this.position);
        distance2Gizmo.position.copy(this.position);
        thicknessGizmo.position.copy(this.position);

        distance1Gizmo.quaternion.copy(this.quaternion);
        distance2Gizmo.quaternion.copy(this.quaternion).invert();
        thicknessGizmo.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

        thicknessGizmo.length = 0.3;

        race1Gizmo.scale.setScalar(0.3);
        race2Gizmo.scale.setScalar(0.3);

        distance1Gizmo.tip.add(race1Gizmo);
        distance2Gizmo.tip.add(race2Gizmo);

        const l1 = distance1Gizmo.execute(length => {
            params.distance1 = length;
            cb(params);
        }, finishFast);

        const a1 = race1Gizmo.execute(angle => {
            params.race1 = angle;
            cb(params);
        }, finishFast);

        const l2 = distance2Gizmo.execute(length => {
            params.distance2 = length;
            cb(params);
        }, finishFast);

        const a2 = race2Gizmo.execute(angle => {
            params.race2 = angle;
            cb(params);
        }, finishFast);

        const t = thicknessGizmo.execute(thickness => {
            params.thickness1 = params.thickness2 = thickness;
            cb(params);
        }, finishFast);

        return CancellablePromise.all([a1, l1, a2, l2, t]);
    }

    readonly position = new THREE.Vector3();
    readonly quaternion = new THREE.Quaternion();
}