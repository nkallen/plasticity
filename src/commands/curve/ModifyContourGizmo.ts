import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxialScaleGizmo, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { ModifyContourParams } from "./ModifyContourFactory";

const Y = new THREE.Vector3(0, 1, 0);

export class ModifyContourGizmo extends CompositeGizmo<ModifyContourParams> {
    private readonly segments: MagnitudeGizmo[] = [];

    constructor(params: ModifyContourParams, editor: EditorLike) {
        super(params, editor);

        for (const segment of params.segmentAngles) {
            const gizmo = new MagnitudeGizmo("fillet-curve:radius", this.editor);
            this.segments.push(gizmo);
        }
    }

    prepare() {
        const { segments, params } = this;

        for (const segment of segments) segment.relativeScale.setScalar(0.8);

        const quat = new THREE.Quaternion();
        for (const [i, corner] of params.segmentAngles.entries()) {
            const gizmo = this.segments[i];
            gizmo.relativeScale.setScalar(0.8);
            quat.setFromUnitVectors(Y, corner.normal);
            gizmo.quaternion.copy(quat);
            gizmo.position.copy(corner.origin);
        }

        for (const corner of segments) this.add(corner);
    }

    execute(cb: (params: ModifyContourParams) => void, mode: Mode = Mode.None): CancellablePromise<void> {
        const { segments, params } = this;

        for (const [i, segment] of segments.entries()) {
            this.addGizmo(segment, d => {
                params.segments.add(i);
                params.distance = d;
            });
        }

        return super.execute(cb, mode);
    }

    get shouldRescaleOnZoom() {
        return false;
    }
}

export class MagnitudeGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }

    get shouldRescaleOnZoom() { return true }
}