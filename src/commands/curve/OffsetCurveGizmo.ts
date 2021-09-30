import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { EditorLike } from "../AbstractGizmo";
import { AbstractAxialScaleGizmo, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../MiniGizmos";

export class OffsetCurveGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }
    protected accumulate(original: number, dist: number, denom: number, sign: number = 1): number {
        if (original === 0) return (dist - denom) / denom;
        else return sign * (original + (dist - denom) * original / denom);
    }
}