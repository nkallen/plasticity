import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { CircleGeometry } from "../../util/Util";
import { AbstractGizmo, EditorLike, Intersector, MovementInfo } from "../AbstractGizmo";

const arrowGeometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 12, 1, false);
const lineGeometry = new LineGeometry();
lineGeometry.setPositions([0.2, 0, 0, 1, 0, 0]);
const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);

type State = 'X' | 'Y' | 'Z' | 'XY' | 'YZ' | 'XZ' | 'screen';
type Mode = {
    tag: State
    plane: THREE.Mesh;
    multiplicand: THREE.Vector3;
}

export class MoveGizmo extends AbstractGizmo<(delta: THREE.Vector3) => void> {
    private mode?: Mode;

    private readonly pointStart: THREE.Vector3;
    private readonly pointEnd: THREE.Vector3;
    private readonly circle: THREE.Mesh;
    private readonly torus: THREE.Mesh;

    constructor(editor: EditorLike, p1: THREE.Vector3) {
        const materials = editor.gizmos;

        const handle = new THREE.Group();
        const picker = new THREE.Group();

        // These planes represent planes of movement; specifically, they're raycasting targets for
        // cursor movement
        const planeXY = new THREE.Mesh(planeGeometry, materials.invisible);
        planeXY.lookAt(0, 0, 1);
        const planeYZ = new THREE.Mesh(planeGeometry, materials.invisible);
        planeYZ.lookAt(1, 0, 0);
        const planeXZ = new THREE.Mesh(planeGeometry, materials.invisible);
        planeXZ.lookAt(0, 1, 0);
        [planeXY, planeYZ, planeXY].forEach(plane => plane.updateMatrixWorld());

        // Setup handles/pickers for movement in X, Y, Z, XY, YZ, XZ, and screen-space.
        {
            const X = new THREE.Vector3(1, 0, 0);
            const fwd = new THREE.Mesh(arrowGeometry, materials.red);
            fwd.position.copy(X);
            fwd.rotation.set(0, 0, -Math.PI / 2);
            fwd.userData.hideWhen = X;
            const line = new Line2(lineGeometry, materials.lineRed);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), materials.invisible);
            p.position.set(0.6, 0, 0);
            p.rotation.set(0, 0, - Math.PI / 2);
            p.userData.mode = { tag: 'X', plane: planeXZ, multiplicand: X } as Mode;
            p.userData.command = ['gizmo:move:x', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        {
            const Y = new THREE.Vector3(0, 1, 0);
            const fwd = new THREE.Mesh(arrowGeometry, materials.green);
            fwd.position.copy(Y);
            fwd.userData.hideWhen = Y;
            const line = new Line2(lineGeometry, materials.lineGreen);
            line.rotation.set(0, 0, Math.PI / 2);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), materials.invisible);
            p.position.set(0, 0.6, 0);
            p.userData.mode = { tag: 'Y', plane: planeXY, multiplicand: Y } as Mode;
            p.userData.command = ['gizmo:move:y', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        {
            const Z = new THREE.Vector3(0, 0, 1);
            const fwd = new THREE.Mesh(arrowGeometry, materials.blue);
            fwd.position.copy(Z);
            fwd.rotation.set(Math.PI / 2, 0, 0);
            fwd.userData.hideWhen = Z;
            const line = new Line2(lineGeometry, materials.lineBlue);
            line.rotation.set(0, - Math.PI / 2, 0);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), materials.invisible);
            p.position.set(0, 0, 0.6);
            p.rotation.set(Math.PI / 2, 0, 0);
            p.userData.mode = { tag: 'Z', plane: planeXZ, multiplicand: Z } as Mode;
            p.userData.command = ['gizmo:move:z', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        {
            const XY = new THREE.Vector3(1, 1, 0);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), materials.yellowTransparent);
            square.position.set(0.3, 0.3, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), materials.invisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { tag: 'XY', plane: planeXY, multiplicand: XY };
            p.userData.command = ['gizmo:move:xy', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        {
            const YZ = new THREE.Vector3(0, 1, 1);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), materials.cyanTransparent);
            square.position.set(0, 0.3, 0.3);
            square.rotation.set(0, Math.PI / 2, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), materials.invisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { tag: 'YZ', plane: planeYZ, multiplicand: YZ };
            p.userData.command = ['gizmo:move:yz', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        {
            const XZ = new THREE.Vector3(1, 0, 1);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), materials.magentaTransparent);
            square.position.set(0.3, 0, 0.3);
            square.rotation.set(-Math.PI / 2, 0, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), materials.invisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { tag: 'XZ', plane: planeXZ, multiplicand: XZ };
            p.userData.command = ['gizmo:move:xz', () => this.mode = p.userData.mode];
            picker.add(p);
        }

        const { circle, torus } = (() => {
            const geometry = new LineGeometry();
            const radius = 0.15;
            geometry.setPositions(CircleGeometry(radius, 32));
            const circle = new Line2(geometry, materials.line);
            handle.add(circle);
            
            const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 4, 24), materials.invisible);
            torus.userData.mode = { tag: 'screen' };
            torus.userData.command = ['gizmo:move:screen', () => this.mode = torus.userData.mode];
            picker.add(torus);

            return { circle, torus };
        })();

        super("move", editor, { handle: handle, picker: picker });

        this.pointStart = new THREE.Vector3();
        this.pointEnd = new THREE.Vector3();

        this.circle = circle;
        this.torus = torus;

        this.position.copy(p1);
    }

    onPointerHover(intersect: Intersector): void {
        const picker = intersect(this.picker, true);
        if (picker) this.mode = picker.object.userData.mode as Mode;
        else this.mode = undefined;
    }

    onPointerDown(intersect: Intersector): void {
        if (!this.mode) throw new Error("invalid state");
        const mode = this.mode;
        if (mode.tag != 'screen') {
            const planeIntersect = intersect(mode.plane, true);
            if (!planeIntersect) throw "corrupt intersection query";
            this.pointStart.copy(planeIntersect.point);
        }
    }

    onPointerMove(cb: (delta: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo): void {
        if (!this.mode) throw new Error("invalid state");
        switch (this.mode.tag) {
            case 'X':
            case 'Y':
            case 'Z':
            case 'XY':
            case 'YZ':
            case 'XZ':
                const planeIntersect = intersect(this.mode.plane, true);
                if (planeIntersect == null) return; // this only happens when the is dragging through different viewports.

                this.pointEnd.copy(planeIntersect.point);
                cb(this.pointEnd.sub(this.pointStart).multiply(this.mode.multiplicand));
                break;
            case 'screen':
                cb(info.pointEnd3d.sub(info.pointStart3d));
                break;
        }
    }
    onPointerUp(intersect: Intersector, info: MovementInfo) {}

    update(camera: THREE.Camera): void {
        super.update(camera);

        this.circle.lookAt(camera.position);
        this.torus.lookAt(camera.position);
        this.circle.updateMatrixWorld();
        this.torus.updateMatrixWorld();

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();
        const align = new THREE.Vector3();
        const dir = new THREE.Vector3();

        if (this.mode != null) {
            switch (this.mode.tag) {
                case 'X':
                case 'Y':
                case 'Z':
                    align.copy(eye).cross(this.mode.multiplicand);
                    dir.copy(this.mode.multiplicand).cross(align);
                    break;
                default:
                    return;
            }
            const matrix = new THREE.Matrix4();
            matrix.lookAt(new THREE.Vector3(), dir, align);
            this.mode.plane.quaternion.setFromRotationMatrix(matrix);
            this.mode.plane.updateMatrixWorld();
        }

        // hide objects facing the camera
        const AXIS_HIDE_TRESHOLD = 0.99;
        for (const child of [...this.handle.children, ...this.picker.children]) {
            if (child.userData.hideWhen === undefined) continue;
            child.visible = true;

            if (Math.abs(align.copy(child.userData.hideWhen).dot(eye)) > AXIS_HIDE_TRESHOLD) {
                child.visible = false;
            }
        }
    }
}