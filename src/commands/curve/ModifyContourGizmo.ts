import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxialScaleGizmo, AbstractAxisGizmo, arrowGeometry, AxisHelper, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { ModifyContourParams } from "./ModifyContourFactory";

const Y = new THREE.Vector3(0, 1, 0);

export class ModifyContourGizmo extends CompositeGizmo<ModifyContourParams> {
    private readonly segments: ExtrudeLikeGizmo[] = [];
    private readonly corners: MagnitudeGizmo[] = [];

    constructor(params: ModifyContourParams, editor: EditorLike) {
        super(params, editor);

        for (const segment of params.segmentAngles) {
            const gizmo = new ExtrudeLikeGizmo("fillet-curve:radius", this.editor);
            this.segments.push(gizmo);
        }

        for (const corner of params.cornerAngles) {
            const gizmo = new MagnitudeGizmo("fillet-curve:radius", this.editor);
            gizmo.userData.index = corner.index;
            this.corners.push(gizmo);
        }
    }

    prepare() {
        const { segments, corners, params } = this;

        for (const segment of segments) segment.relativeScale.setScalar(0.8);

        const quat = new THREE.Quaternion();
        for (const [i, segment] of params.segmentAngles.entries()) {
            const gizmo = this.segments[i];
            gizmo.relativeScale.setScalar(0.5);
            quat.setFromUnitVectors(Y, segment.normal);
            gizmo.quaternion.copy(quat);
            gizmo.position.copy(segment.origin);
        }

        for (const [i, corner] of params.cornerAngles.entries()) {
            const gizmo = this.corners[i];
            gizmo.relativeScale.setScalar(0.8);
            quat.setFromUnitVectors(Y, corner.tau.cross(corner.axis));
            gizmo.quaternion.copy(quat);
            gizmo.position.copy(corner.origin);
        }

        for (const segment of segments) this.add(segment);
        for (const corner of corners) this.add(corner);

    }

    execute(cb: (params: ModifyContourParams) => void, mode: Mode = Mode.None): CancellablePromise<void> {
        const { segments, params, corners } = this;

        for (const [i, segment] of segments.entries()) {
            this.addGizmo(segment, d => {
                params.mode = 'offset';
                params.segment = i;
                params.distance = d;
            });
        }

        for (const corner of corners) {
            this.addGizmo(corner, d => {
                params.mode = 'fillet';
                params.radiuses[corner.userData.index] = d;
            });
        }

        return super.execute(cb, mode);
    }

    get shouldRescaleOnZoom() { return false }
}

class ExtrudeLikeGizmo extends AbstractAxisGizmo {
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

    // render(length: number) { super.render(-length - 0.35) }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }

    get shouldRescaleOnZoom() { return true }
}

export class MagnitudeGizmo extends AbstractAxialScaleGizmo {
    handleLength = -0.35;
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }

    protected accumulate(original: number, dist: number, denom: number, sign: number = 1): number {
        if (original === 0) return Math.max(0, dist - denom);
        else return (original + ((dist - denom) * original) / denom);
    }

    get shouldRescaleOnZoom() { return true }
}