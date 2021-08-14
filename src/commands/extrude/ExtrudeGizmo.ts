import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AbstractAxialScaleGizmo, AngleGizmo, boxGeometry, lineGeometry, MagnitudeStateMachine } from "../MiniGizmos";
import { ExtrudeLikeGizmo } from "../modifyface/OffsetFaceGizmo";
import { ExtrudeParams } from "./ExtrudeFactory";

export class ExtrudeGizmo extends CompositeGizmo<ExtrudeParams> {
    private readonly distance1Gizmo = new ExtrudeLikeGizmo("extrude:distance1", this.editor);
    private readonly race1Gizmo = new AngleGizmo("extrude:race1", this.editor, this.editor.gizmos.white);
    private readonly race2Gizmo = new AngleGizmo("extrude:race2", this.editor, this.editor.gizmos.white);
    private readonly distance2Gizmo = new ExtrudeLikeGizmo("extrude:distance2", this.editor);
    private readonly thicknessGizmo = new MagnitudeGizmo("extrude:thickness", this.editor);

    prepare() {
        const { race1Gizmo, distance1Gizmo, race2Gizmo, distance2Gizmo, thicknessGizmo } = this;
        race1Gizmo.relativeScale.setScalar(0.3);
        race2Gizmo.relativeScale.setScalar(0.3);

        this.add(distance1Gizmo, distance2Gizmo, thicknessGizmo);

        distance1Gizmo.tip.add(race1Gizmo);
        distance2Gizmo.tip.add(race2Gizmo);
    }

    execute(cb: (params: ExtrudeParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { race1Gizmo, distance1Gizmo, race2Gizmo, distance2Gizmo, thicknessGizmo, params } = this;

        distance2Gizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
        thicknessGizmo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));

        this.addGizmo(distance1Gizmo, length => {
            params.distance1 = length;
        });

        this.addGizmo(race1Gizmo, angle => {
            params.race1 = angle;
        });

        this.addGizmo(distance2Gizmo, length => {
            params.distance2 = length;
        });

        this.addGizmo(race2Gizmo, angle => {
            params.race2 = angle;
        });

        this.addGizmo(thicknessGizmo, thickness => {
            params.thickness1 = params.thickness2 = thickness;
        });

        return super.execute(cb, finishFast);
    }
}

class MagnitudeGizmo extends AbstractAxialScaleGizmo {
    readonly state = new MagnitudeStateMachine(0);
    readonly tip: THREE.Mesh<any, any> = new THREE.Mesh(boxGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    handleLength = 0.3;

    constructor(name: string, editor: EditorLike) {
        super(name, editor, editor.gizmos.default);
        this.setup();
    }
}