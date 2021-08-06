import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo, DistanceGizmo } from "../MiniGizmos";
import { OffsetFaceParams } from './ModifyFaceFactory';

export class OffsetFaceGizmo extends CompositeGizmo<OffsetFaceParams> {
    private readonly main = new DistanceGizmo("offset-face:distance", this.editor);
    
    constructor(params: OffsetFaceParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
        this.main.allowNegative = true;
        this.main.constantLength = true;
    }

    execute(cb: (params: OffsetFaceParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { main, params } = this;

        const { point, normal } = this.placement(this.hint);
        main.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        main.position.copy(point);

        this.add(main);

        this.addGizmo(main, distance => {
            params.distance = distance;
        });

        return super.execute(cb, finishFast);
    }

    private placement(point?: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
        const { params: { faces }, editor: { db } } = this;
        const models = faces.map(view => db.lookupTopologyItem(view));
        const face = models[models.length - 1];

        if (point !== undefined) {
            const { u, v, normal } = face.NearPointProjection(vec2cart(point));
            const { faceU, faceV } = face.GetFaceParam(u,v);
            const projected = cart2vec(face.Point(faceU, faceV));
            return { point: projected, normal: vec2vec(normal) };
        } else {
            const { normal, point } = face.GetAnyPointOn();
            return { point: cart2vec(point), normal: vec2vec(normal) };
        }
    }

}