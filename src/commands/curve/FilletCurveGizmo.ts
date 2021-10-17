import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxialScaleGizmo, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";
import { FilletCurveParams } from "./ContourFilletFactory";

const Y = new THREE.Vector3(0, 1, 0);

export class FilletCurveGizmo extends CompositeGizmo<FilletCurveParams> {
    private readonly main = new MagnitudeGizmo("fillet-curve:radius", this.editor);
    private readonly corners: MagnitudeGizmo[] = [];

    constructor(params: FilletCurveParams, editor: EditorLike) {
        super(params, editor);

        for (const corner of params.cornerAngles) {
            const gizmo = new MagnitudeGizmo("fillet-curve:radius", this.editor);
            gizmo.userData.index = corner.index;
            this.corners.push(gizmo);
        }
    }

    prepare() {
        const { main, corners, params } = this;

        main.visible = false;
        for (const corner of corners) corner.relativeScale.setScalar(0.8);

        const quat = new THREE.Quaternion();
        for (const [i, corner] of params.cornerAngles.entries()) {
            const gizmo = this.corners[i];
            gizmo.relativeScale.setScalar(0.8);
            quat.setFromUnitVectors(Y, corner.tau.cross(corner.axis));
            gizmo.quaternion.copy(quat);
            gizmo.position.copy(corner.origin);
            gizmo.userData.index = corner.index;
        }

        this.add(main);
        for (const corner of corners) this.add(corner);
    }

    execute(cb: (params: FilletCurveParams) => void, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        const { main, corners, params } = this;

        this.addGizmo(main, d => {
            for (const [i, corner] of params.cornerAngles.entries()) {
                params.radiuses[corner.index] = d;
                corners[i].value = d;
            }
        });

        for (const corner of corners) {
            this.addGizmo(corner, d => {
                params.radiuses[corner.userData.index] = d;
            });
        }

        return super.execute(cb, mode);
    }

    get shouldRescaleOnZoom() {
        return false;
    }
}

export class MagnitudeGizmo extends AbstractAxialScaleGizmo {
    handleLength = 0;
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
        this.shaft.visible = false;
    }

    get shouldRescaleOnZoom() { return true }
}