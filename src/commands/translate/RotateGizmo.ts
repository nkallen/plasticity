import { CancellablePromise } from "../../util/Cancellable";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../../util/Util";
import { AbstractGizmo, EditorLike, Intersector, mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AngleGizmo } from "../MiniGizmos";
import { RotateParams } from "./TranslateFactory";

type State = 'X' | 'Y' | 'Z' | 'screen';
type Mode = {
    tag: State
    axis: THREE.Vector3;
}
const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
export class _RotateGizmo extends AbstractGizmo<(axis: THREE.Vector3, angle: number) => void> {
    private mode?: Mode;
    private readonly circle: THREE.Mesh;
    private readonly torus: THREE.Mesh;
    private readonly plane: THREE.Mesh;

    constructor(editor: EditorLike, p1: THREE.Vector3) {
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const radius = 0.85;
        {
            const geometry = new LineGeometry();
            geometry.setPositions(CircleGeometry(radius, 64));
            const circle = new Line2(geometry, editor.gizmos.lineRed);
            circle.rotation.set(0, -Math.PI / 2, 0);
            handle.add(circle);

            const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
            torus.rotation.copy(circle.rotation);
            torus.userData.mode = { tag: 'X', axis: new THREE.Vector3(1, 0, 0) };
            torus.userData.command = ['gizmo:rotate:x', () => this.mode = torus.userData.mode];
            picker.add(torus)
        }

        {
            const geometry = new LineGeometry();
            geometry.setPositions(CircleGeometry(radius, 64));
            const circle = new Line2(geometry, editor.gizmos.lineGreen);
            circle.rotation.set(-Math.PI / 2, 0, 0);
            handle.add(circle);

            const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
            torus.rotation.copy(circle.rotation);
            torus.userData.mode = { tag: 'Y', axis: new THREE.Vector3(0, 1, 0) };
            torus.userData.command = ['gizmo:rotate:y', () => this.mode = torus.userData.mode];
            picker.add(torus)
        }

        {
            const geometry = new LineGeometry();
            geometry.setPositions(CircleGeometry(radius, 64));
            const circle = new Line2(geometry, editor.gizmos.lineBlue);
            circle.rotation.set(0, 0, -Math.PI / 2);
            handle.add(circle);

            const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
            torus.rotation.copy(circle.rotation);
            torus.userData.mode = { tag: 'Z', axis: new THREE.Vector3(0, 0, 1) };
            torus.userData.command = ['gizmo:rotate:z', () => this.mode = torus.userData.mode];
            picker.add(torus)
        }

        const { circle, torus } = (() => {
            const radius = 1;
            const geometry = new LineGeometry();
            geometry.setPositions(CircleGeometry(radius, 64));
            const circle = new Line2(geometry, materials.line);
            handle.add(circle);

            const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
            torus.userData.mode = { tag: 'screen' };
            torus.userData.command = ['gizmo:rotate:screen', () => this.mode = torus.userData.mode];
            picker.add(torus);

            return { circle, torus };
        })();

        const occludeBackHalf = new THREE.Mesh(planeGeometry, materials.occlude);
        occludeBackHalf.renderOrder = -1;

        super("rotate", editor, { handle, picker });

        this.circle = circle;
        this.torus = torus;
        this.plane = occludeBackHalf;
        this.position.copy(p1);

        this.add(occludeBackHalf);
    }

    onInterrupt(cb: (axis: THREE.Vector3, angle: number) => void) {}

    onPointerHover(intersect: Intersector): void {
        this.picker.updateMatrixWorld();
        const picker = intersect(this.picker, true);
        if (picker) this.mode = picker.object.userData.mode as Mode;
        else this.mode = undefined;
    }

    onPointerDown(intersect: Intersector, info: MovementInfo) {}
    onPointerUp(intersect: Intersector, info: MovementInfo) {}

    onPointerMove(cb: (axis: THREE.Vector3, angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        if (!this.mode) throw "invalid state";
        switch (this.mode.tag) {
            case 'screen':
                cb(info.eye, info.angle);
                break;
            default:
                let angle = info.angle;
                if (info.eye.dot(this.mode.axis) < 0) angle *= -1;
                cb(this.mode.axis, angle);
        }
    }

    update(camera: THREE.Camera): void {
        super.update(camera);

        this.plane.lookAt(camera.position);
        this.circle.lookAt(camera.position);
        this.torus.lookAt(camera.position);
        this.circle.updateMatrixWorld();
        this.torus.updateMatrixWorld();

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();
        this.plane.position.copy(this.circle.position);
        this.plane.position.add(eye.clone().multiplyScalar(-0.01))
        this.plane.updateMatrixWorld();
    }
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class RotateGizmo extends CompositeGizmo<RotateParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.lineRed;
    private readonly green = this.materials.lineGreen;
    private readonly blue = this.materials.lineBlue;
    private readonly white = this.materials.line;
    private readonly x = new AxisAngleGizmo("rotate:x", this.editor, this.red);
    private readonly y = new AxisAngleGizmo("rotate:y", this.editor, this.green);
    private readonly z = new AxisAngleGizmo("rotate:z", this.editor, this.blue);
    private readonly screen = new AngleGizmo("rotate:screen", this.editor, this.white);
    private readonly occludeBackHalf: THREE.Mesh;

    constructor(params: RotateParams, editor: EditorLike) {
        super(params, editor);

        const occludeBackHalf = new THREE.Mesh(planeGeometry, this.materials.occlude);
        occludeBackHalf.renderOrder = -1;
        this.add(occludeBackHalf);
        this.occludeBackHalf = occludeBackHalf;
    }

    prepare() {
        const { x, y, z, screen } = this;
        for (const o of [x, y, z]) o.relativeScale.setScalar(0.7);
        screen.relativeScale.setScalar(0.8);
    }

    execute(cb: (params: RotateParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, screen, params } = this;
        const originalPosition = this.position.clone();

        x.quaternion.setFromUnitVectors(Z, X);
        y.quaternion.setFromUnitVectors(Z, Y);
        z.quaternion.setFromUnitVectors(Z, Z);

        this.add(x, y, z, screen);

        const set = () => {

        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);

        this.addGizmo(screen, set);

        return super.execute(cb, finishFast);
    }

    update(camera: THREE.Camera): void {
        super.update(camera);

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();

        this.occludeBackHalf.lookAt(camera.position);
        this.occludeBackHalf.position.copy(this.screen.position);
        this.occludeBackHalf.position.add(eye.clone().multiplyScalar(-0.01))
        this.occludeBackHalf.updateMatrixWorld();
    }
}

export class AxisAngleGizmo extends AngleGizmo {
    update(camera: THREE.Camera) {
        // do not face camera
        this.scaleIndependentOfZoom(camera);
     }
}