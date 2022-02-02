import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { EditorLike, Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { AbstractAxialScaleGizmo, AngleGizmo, DistanceGizmo, lineGeometry, MagnitudeStateMachine, sphereGeometry } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { MagnitudeGizmo } from "../extrude/ExtrudeGizmo";
import { PipeParams } from "./PipeFactory";

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

export class PipeGizmo extends CompositeGizmo<PipeParams> {
    private readonly sectionSizeGizmo = new SectionSizeGizmo("pipe:section-size", this.editor);
    private readonly angleGizmo = new AngleGizmo("pipe:angle", this.editor, this.editor.gizmos.white);
    private readonly thicknessGizmo = new MagnitudeGizmo("pipe:thickness", this.editor);

    protected prepare(mode: Mode) {
        const { sectionSizeGizmo, thicknessGizmo, angleGizmo } = this;
        sectionSizeGizmo.relativeScale.setScalar(0.8);
        thicknessGizmo.relativeScale.setScalar(0.8);
        angleGizmo.relativeScale.setScalar(0.8);

        thicknessGizmo.quaternion.setFromUnitVectors(Z, Y);
        
        this.add(sectionSizeGizmo, angleGizmo, thicknessGizmo);
    }

    execute(cb: (params: PipeParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { angleGizmo, sectionSizeGizmo, thicknessGizmo, params } = this;

        sectionSizeGizmo.value = params.sectionSize;
        thicknessGizmo.value = params.thickness1;

        this.addGizmo(sectionSizeGizmo, size => {
            params.sectionSize = size;
        });

        this.addGizmo(angleGizmo, angle => {
            params.angle = angle;
        });

        this.addGizmo(thicknessGizmo, thickness => {
            params.thickness1 = thickness;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return true }

    render(params: PipeParams) {
        this.sectionSizeGizmo.render(1);
        this.thicknessGizmo.render(params.thickness1);
    }
}

class SectionSizeGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(sphereGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }

    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }

    render(length: number) {
        super.render(length - 0.5);
    }

    get shouldRescaleOnZoom() { return false }
}