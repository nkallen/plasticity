import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { EditorLike, Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { GizmoMaterial } from "../../command/GizmoMaterials";
import { AbstractAxisGizmo, arrowGeometry, AxisHelper, lineGeometry, MagnitudeStateMachine } from "../../command/MiniGizmos";
import { ProxyCamera } from "../../components/viewport/ProxyCamera";
import { CancellablePromise } from "../../util/CancellablePromise";
import { AxisAngleGizmo } from "../translate/RotateGizmo";
import { ScaleAxisGizmo } from "../translate/ScaleGizmo";
import { PlaceParams } from "./PlaceFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class PlaceGizmo extends CompositeGizmo<PlaceParams> {
    private readonly materials = this.editor.gizmos;
    private readonly blue = this.materials.blue;
    private readonly z = new ScaleAxisGizmo("place:scale", this.editor, this.blue);
    private readonly angle = new AxisAngleGizmo("place:angle", this.editor, this.blue);

    readonly pivot = new THREE.Vector3();

    protected prepare(mode: Mode) {
        const { z, angle: rotate } = this;

        for (const o of [z, rotate]) o.relativeScale.setScalar(0.8);
        this.add(z, rotate);

        z.quaternion.setFromUnitVectors(Y, Z);

        this.pivot.copy(this.position);
    }

    execute(cb: (params: PlaceParams) => void, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        const { z, angle, params } = this;

        this.addGizmo(z, scale => {
            params.scale = scale;
        });

        this.addGizmo(angle, angle => {
            params.angle = angle;
        });

        return super.execute(cb, mode);
    }

    render(params: PlaceParams) {
        this.position.copy(params.destination);
    }
}


export class MoveAxisGizmo extends AbstractAxisGizmo {
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

    update(camera: ProxyCamera) {
        super.update(camera);

        const { eye, worldQuaternion } = this;

        // hide objects facing the camera
        this.visible = true;
        const dot = localY.copy(Y).applyQuaternion(worldQuaternion).dot(eye);
        if (Math.abs(dot) > AXIS_HIDE_TRESHOLD) {
            this.visible = false;
        }
    }
}

const localY = new THREE.Vector3();

const AXIS_HIDE_TRESHOLD = 0.99;