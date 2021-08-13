import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import c3d from '../../build/Release/c3d.node';
import { CancellablePromise } from "../../util/Cancellable";
import { cart2vec, vec2cart, vec2vec } from "../../util/Conversion";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxisGizmo, AngleGizmo, AxisHelper, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { OffsetFaceParams } from './ModifyFaceFactory';

export class OffsetFaceGizmo extends CompositeGizmo<OffsetFaceParams> {
    private readonly distance = new ExtrudeLikeGizmo("offset-face:distance", this.editor);
    private readonly angle = new AngleGizmo("offset-face:angle", this.editor, this.editor.gizmos.white);

    constructor(params: OffsetFaceParams, editor: EditorLike, private readonly hint?: THREE.Vector3) {
        super(params, editor);
        this.distance.state.min = Number.NEGATIVE_INFINITY;
    }

    prepare() {
        this.distance.relativeScale.setScalar(0.8);
        this.angle.relativeScale.setScalar(0.3);
    }

    execute(cb: (params: OffsetFaceParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { distance, angle, params } = this;

        const { point, normal } = this.placement(this.hint);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.position.copy(point);

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

export class ExtrudeLikeGizmo extends AbstractAxisGizmo {
    readonly state = new MagnitudeStateMachine(0);
    protected material = this.editor.gizmos.default;
    readonly helper = new AxisHelper(this.material.line);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.editor.gizmos.default.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.editor.gizmos.default.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor);
        this.setup();
        this.add(this.helper);
    }

    // The handle has constant length
    render(length: number) {
        super.render(1);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }
}