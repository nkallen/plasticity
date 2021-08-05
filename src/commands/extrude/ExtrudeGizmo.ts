import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { AngleGizmo, CompositeGizmo, DistanceGizmo, LengthGizmo } from "../MiniGizmos";
import { ExtrudeParams } from "./ExtrudeFactory";

export class ExtrudeGizmo extends CompositeGizmo<ExtrudeParams> {
    private readonly race1Gizmo = new AngleGizmo("extrude:race1", this.editor);
    private readonly distance1Gizmo = new DistanceGizmo("extrude:distance1", this.editor);
    private readonly race2Gizmo = new AngleGizmo("extrude:race2", this.editor);
    private readonly distance2Gizmo = new DistanceGizmo("extrude:distance2", this.editor);
    private readonly thicknessGizmo = new LengthGizmo("extrude:thickness", this.editor);

    execute(cb: (params: ExtrudeParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { race1Gizmo, distance1Gizmo, race2Gizmo, distance2Gizmo, thicknessGizmo, params } = this;

        distance2Gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
        thicknessGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));

        this.add(distance1Gizmo, distance2Gizmo, thicknessGizmo);

        thicknessGizmo.length = 0;

        race1Gizmo.scale.setScalar(0.3);
        race2Gizmo.scale.setScalar(0.3);

        distance1Gizmo.tip.add(race1Gizmo);
        distance2Gizmo.tip.add(race2Gizmo);

        this.addGizmo(distance1Gizmo, length => {
            params.distance1 = length;
        });

        this.addGizmo(race1Gizmo, angle => {
            params.race1 = angle;
        });

        this.addGizmo(distance2Gizmo, length => {
            params.distance2 = length;
        });

        this.addGizmo(race2Gizmo, angle => {
            params.race2 = angle;
        });

        this.addGizmo(thicknessGizmo, thickness => {
            params.thickness1 = params.thickness2 = thickness;
        });

        return super.execute(cb, finishFast);
    }
}