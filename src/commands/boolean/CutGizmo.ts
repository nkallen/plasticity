import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { AbstractGizmo, MovementInfo, EditorLike, Intersector, Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { GizmoMaterial } from "../../command/GizmoMaterials";
import { arrowGeometry, AxisHelper, lineGeometry } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { CutParams } from "./CutFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class CutGizmo extends CompositeGizmo<CutParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.red;
    private readonly green = this.materials.green;
    private readonly blue = this.materials.blue;
    private readonly x = new MirrorAxisGizmo("mirror:x", this.editor, this.red);
    private readonly y = new MirrorAxisGizmo("mirror:y", this.editor, this.green);
    private readonly z = new MirrorAxisGizmo("mirror:z", this.editor, this.blue);


    prepare() {
        const { x, y, z } = this;
        for (const o of [x, y, z]) o.relativeScale.setScalar(0.8);
        this.add(x, y, z);
    }

    execute(cb: (params: CutParams) => void, mode: Mode = Mode.Persistent | Mode.DisableSelection): CancellablePromise<void> {
        const { x, y, z, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        this.addGizmo(x, () => {
            params.axes = ['X'];
        });
        this.addGizmo(y, () => {
            params.axes = ['Y'];
        });
        this.addGizmo(z, () => {
            params.axes = ['Z'];
        });


        return super.execute(cb, mode);
    }
}

class MirrorAxisGizmo extends AbstractGizmo<boolean>  {
    readonly tip = new THREE.Mesh(arrowGeometry, this.material.mesh);
    protected readonly shaft = new Line2(lineGeometry, this.material.line2);
    protected readonly knob = new THREE.Mesh(new THREE.SphereGeometry(0.2), this.editor.gizmos.invisible);
    readonly helper = new AxisHelper(this.material.line);

    constructor(
        private readonly longName: string,
        editor: EditorLike,
        protected readonly material: GizmoMaterial
    ) {
        super(longName.split(':')[0], editor);
        this.setup();
        this.add(this.helper);
    }

    protected setup() {
        this.knob.userData.command = [`gizmo:${this.longName}`, (cb: (t: boolean) => void) => {
            cb(true);
            return true;
        }];
        this.tip.position.set(0, 1, 0);
        this.knob.position.copy(this.tip.position);

        this.handle.add(this.tip, this.shaft);
        this.picker.add(this.knob);
    }

    onInterrupt(cb: (b: boolean) => void) { }
    onPointerMove(cb: (b: boolean) => void, intersect: Intersector, info: MovementInfo) {
        return undefined;
    }
    onPointerUp(cb: (b: boolean) => void, intersect: Intersector, info: MovementInfo) { }

    onPointerDown(cb: (b: boolean) => void, intersect: Intersector, info: MovementInfo) {
        cb(true);
    }
}