import * as THREE from "three";
import { CancellablePromise } from "../../util/CancellablePromise";
import { EditorLike, Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { FilletFaceParams } from './ModifyFaceFactory';
import { ExtrudeLikeGizmo, OffsetFaceGizmo } from "./OffsetFaceGizmo";


export class RefilletGizmo extends CompositeGizmo<FilletFaceParams> {
    private readonly distance = new ExtrudeLikeGizmo("refillet-face:distance", this.editor);

    constructor(params: FilletFaceParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
        this.distance.state.min = Number.NEGATIVE_INFINITY;
    }

    prepare() {
        this.distance.relativeScale.setScalar(0.8);
    }

    execute(cb: (params: FilletFaceParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { distance, params } = this;

        const { point, normal } = this.placement(this.hint);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.position.copy(point);

        this.add(distance);

        this.addGizmo(distance, distance => {
            params.distance = distance;
            this.position.set(0, distance, 0).applyQuaternion(this.quaternion).add(point);
        });

        return super.execute(cb, finishFast);
    }

    private placement(point?: THREE.Vector3): { point: THREE.Vector3; normal: THREE.Vector3; } {
        const { params: { faces }, editor: { db } } = this;
        const models = faces.map(view => db.lookupTopologyItem(view));
        const face = models[models.length - 1];

        return OffsetFaceGizmo.placement(face, point);
    }
}
