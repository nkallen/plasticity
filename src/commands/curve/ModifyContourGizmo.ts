import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxisGizmo, arrowGeometry, AxisHelper, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { ModifyContourParams } from "./ModifyContourFactory";

const Y = new THREE.Vector3(0, 1, 0);

export class ModifyContourGizmo extends CompositeGizmo<ModifyContourParams> {
    private readonly segments: ExtrudeLikeGizmo[] = [];

    constructor(params: ModifyContourParams, editor: EditorLike) {
        super(params, editor);

        for (const segment of params.segmentAngles) {
            const gizmo = new ExtrudeLikeGizmo("fillet-curve:radius", this.editor);
            this.segments.push(gizmo);
        }
    }

    prepare() {
        const { segments, params } = this;

        for (const segment of segments) segment.relativeScale.setScalar(0.8);

        const quat = new THREE.Quaternion();
        for (const [i, corner] of params.segmentAngles.entries()) {
            const gizmo = this.segments[i];
            gizmo.relativeScale.setScalar(0.5);
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
                params.segment = i;
                params.distance = d;
            });
        }

        return super.execute(cb, mode);
    }

    get shouldRescaleOnZoom() { return false }
}

export class ExtrudeLikeGizmo extends AbstractAxisGizmo {
    readonly state = new MagnitudeStateMachine(0, false);
    protected material = this.editor.gizmos.default;
    readonly helper = new AxisHelper(this.material.line);
    readonly tip = new THREE.Mesh(arrowGeometry, this.editor.gizmos.default.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.editor.gizmos.default.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor);
        this.setup();
        this.add(this.helper);
    }

    // render(length: number) { super.render(0) }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }

    get shouldRescaleOnZoom() { return true }
}