import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { EditorLike, Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { GizmoMaterial } from "../../command/GizmoMaterials";
import { AbstractAxisGizmo, arrowGeometry, AxisHelper, lineGeometry, MagnitudeStateMachine } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { OffsetCurveParams } from "./OffsetContourFactory";

export class OffsetCurveGizmo extends CompositeGizmo<OffsetCurveParams> {
    private readonly materials = this.editor.gizmos;
    private readonly yellow = this.materials.yellow;
    private readonly n = new OffsetAxisGizmo('offset-curve:distance', this.editor, this.yellow);
    private originalPosition!: THREE.Vector3;

    protected prepare(mode: Mode) {
        const { n } = this;

        n.relativeScale.setScalar(0.8);
        this.add(n);

        this.originalPosition = this.position.clone();
    }

    private readonly y = new THREE.Vector3(0, 1, 0);
    execute(cb: (params: OffsetCurveParams) => void, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        const { n, params } = this;
        const { y } = this;

        this.addGizmo(n, t => {
            params.distance = t;
            y.set(0, t, 0).applyQuaternion(this.quaternion);
            this.position.copy(this.originalPosition).add(y);
        });

        return super.execute(cb, mode);
    }
}

export class OffsetAxisGizmo extends AbstractAxisGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip = new THREE.Mesh(arrowGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    readonly helper = new AxisHelper(this.material.line);

    constructor(name: string, editor: EditorLike, protected readonly material: GizmoMaterial) {
        super(name, editor);
        this.setup();
        this.add(this.helper);
    }

    protected accumulate(original: number, sign: number, dist: number): number {
        return original + dist
    }

    render(length: number) { }
}