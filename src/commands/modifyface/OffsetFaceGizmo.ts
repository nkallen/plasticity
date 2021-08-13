import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, GizmoHelper, mode } from "../AbstractGizmo";
import { AngleGizmo, AxisHelper, DistanceGizmo } from "../MiniGizmos";
import { CompositeGizmo } from "../CompositeGizmo";
import { OffsetFaceParams } from './ModifyFaceFactory';
import c3d from '../../build/Release/c3d.node';

export class OffsetFaceGizmo extends CompositeGizmo<OffsetFaceParams> {
    private readonly distance = new MyDistanceGizmo("offset-face:distance", this.editor);
    private readonly angle = new AngleGizmo("offset-face:angle", this.editor);

    constructor(params: OffsetFaceParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
        this.distance.state.min = Number.NEGATIVE_INFINITY;
    }

    prepare() {
        this.distance.scale.setScalar(0.8);
    }

    execute(cb: (params: OffsetFaceParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { distance, angle, params } = this;

        const { point, normal } = this.placement(this.hint);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.position.copy(point);
        angle.scale.setScalar(0.3);

        this.add(distance);
        distance.add(angle);

        this.addGizmo(distance, distance => {
            params.distance = distance;
            this.position.set(0, distance, 0).applyQuaternion(this.quaternion).add(point);
        });

        this.addGizmo(angle, angle => {
            params.angle = angle;
        });

        return super.execute(cb, finishFast);
    }

    private placement(point?: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
        const { params: { faces }, editor: { db } } = this;
        const models = faces.map(view => db.lookupTopologyItem(view));
        const face = models[models.length - 1];

        return OffsetFaceGizmo.placement(face, point);
    }

    static placement(face: c3d.Face, hint?: THREE.Vector3): { point: THREE.Vector3, normal: THREE.Vector3 } {
        if (hint !== undefined) {
            const { u, v, normal } = face.NearPointProjection(vec2cart(hint));
            const { faceU, faceV } = face.GetFaceParam(u, v);
            const projected = cart2vec(face.Point(faceU, faceV));
            return { point: projected, normal: vec2vec(normal) };
        } else {
            const { normal, point } = face.GetAnyPointOn();
            return { point: cart2vec(point), normal: vec2vec(normal) };
        }
    }
}

class MyDistanceGizmo extends DistanceGizmo {
    constructor(name: string, editor: EditorLike) {
        // @ts-expect-error
        const helper = new AxisHelper(editor.gizmos.default);
        super(name, editor, helper);
        this.add(helper);
    }

    render(length: number) {
        super.render(0);
    }
}