import { assertUnreachable } from "../../Util";
import * as THREE from "three";
import { Editor } from '../../Editor';
import * as visual from "../../VisualModel";
import { AbstractGizmo, Intersector, MovementInfo } from "../AbstractGizmo";

const matInvisible = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
})
matInvisible.opacity = 0.15;

const arrowGeometry = new THREE.CylinderGeometry(0, 0.03, 0.1, 12, 1, false);


const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));

const gizmoMaterial = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false
});

const gizmoLineMaterial = new THREE.LineBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    linewidth: 1,
    fog: false,
    toneMapped: false
});

// Make unique material for each axis/color

const matHelper = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matHelper.opacity = 0.33;

const matRed = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matRed.color.set(0xff0000);

const matGreen = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matGreen.color.set(0x00ff00);

const matBlue = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matBlue.color.set(0x0000ff);

const matWhiteTransparent = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matWhiteTransparent.opacity = 0.25;

const matYellowTransparent = matWhiteTransparent.clone() as THREE.MeshBasicMaterial;
matYellowTransparent.color.set(0xffff00);

const matCyanTransparent = matWhiteTransparent.clone() as THREE.MeshBasicMaterial;
matCyanTransparent.color.set(0x00ffff);

const matMagentaTransparent = matWhiteTransparent.clone() as THREE.MeshBasicMaterial;
matMagentaTransparent.color.set(0xff00ff);

const matYellow = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matYellow.color.set(0xffff00);

const matLineRed = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineRed.color.set(0xff0000);

const matLineGreen = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineGreen.color.set(0x00ff00);

const matLineBlue = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineBlue.color.set(0x0000ff);

const matLineCyan = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineCyan.color.set(0x00ffff);

const matLineMagenta = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineMagenta.color.set(0xff00ff);

const matLineYellow = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineYellow.color.set(0xffff00);

const matLineGray = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineGray.color.set(0x787878);

const matLineYellowTransparent = matLineYellow.clone();
matLineYellowTransparent.opacity = 0.25;

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });

export class MoveGizmo extends AbstractGizmo<(delta: THREE.Vector3) => void> {
    private readonly pointStart: THREE.Vector3;
    private readonly pointEnd: THREE.Vector3;

    constructor(editor: Editor, object: visual.SpaceItem, p1: THREE.Vector3) {
        const handle = new THREE.Group();
        const picker = new THREE.Group();

        const planeXY = new THREE.Mesh(planeGeometry, planeMaterial);
        planeXY.lookAt(0, 0, 1);
        const planeYZ = new THREE.Mesh(planeGeometry, planeMaterial);
        planeYZ.lookAt(1, 0, 0);
        const planeXZ = new THREE.Mesh(planeGeometry, planeMaterial);
        planeXZ.lookAt(0, 1, 0);
        [planeXY, planeYZ, planeXY].forEach(plane => plane.updateMatrixWorld());


        {
            const X = new THREE.Vector3(1, 0, 0);
            const fwd = new THREE.Mesh(arrowGeometry, matRed);
            fwd.position.copy(X);
            fwd.rotation.set(0, 0, -Math.PI / 2);
            const line = new THREE.Line(lineGeometry, matLineRed);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
            p.position.set(0.6, 0, 0);
            p.rotation.set(0, 0, - Math.PI / 2);
            p.userData.mode = { state: 'X', plane: planeXZ, multiplicand: X } as Mode;
            picker.add(p);
        }

        {
            const Y = new THREE.Vector3(0, 1, 0);
            const fwd = new THREE.Mesh(arrowGeometry, matGreen);
            fwd.position.copy(Y);
            const line = new THREE.Line(lineGeometry, matLineGreen);
            line.rotation.set(0, 0, Math.PI / 2);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
            p.position.set(0, 0.6, 0);
            p.userData.mode = { state: 'Y', plane: planeXY, multiplicand: Y } as Mode;
            picker.add(p);
        }

        {
            const Z = new THREE.Vector3(0, 0, 1);
            const fwd = new THREE.Mesh(arrowGeometry, matBlue);
            fwd.position.copy(Z);
            fwd.rotation.set(Math.PI / 2, 0, 0);
            const line = new THREE.Line(lineGeometry, matLineBlue);
            line.rotation.set(0, - Math.PI / 2, 0);
            handle.add(fwd, line);

            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
            p.position.set(0, 0, 0.6);
            p.rotation.set(Math.PI / 2, 0, 0);
            p.userData.mode = { state: 'Z', plane: planeXZ, multiplicand: Z } as Mode;
            picker.add(p);
        }

        {
            const XY = new THREE.Vector3(1, 1, 0);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), matYellowTransparent.clone());
            square.position.set(0.25, 0.25, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), matInvisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { state: 'XY', plane: planeXY, multiplicand: XY };
            picker.add(p);
        }

        {
            const YZ = new THREE.Vector3(0, 1, 1);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), matCyanTransparent.clone());
            square.position.set(0, 0.25, 0.25);
            square.rotation.set(0, Math.PI / 2, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), matInvisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { state: 'YZ', plane: planeYZ, multiplicand: YZ };
            picker.add(p);
        }

        {
            const XZ = new THREE.Vector3(1, 0, 1);
            const square = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), matMagentaTransparent.clone());
            square.position.set(0.25, 0, 0.25);
            square.rotation.set(-Math.PI / 2, 0, 0);
            handle.add(square);

            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), matInvisible);
            p.position.copy(square.position);
            p.rotation.copy(square.rotation);
            p.userData.mode = { state: 'XZ', plane: planeXZ, multiplicand: XZ };
            picker.add(p);
        }

        super(editor, object, { handle: handle, picker: picker, delta: null, helper: null });

        this.pointStart = new THREE.Vector3();
        this.pointEnd = new THREE.Vector3();

        this.position.copy(p1);
        // this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
    }

    private mode?: Mode;

    onPointerHover(intersect: Intersector) {
        const picker = intersect(this.picker, true);
        if (picker) this.mode = picker.object.userData.mode as Mode;
        else this.mode = null;
    }

    onPointerDown(intersect: Intersector) {
        const planeIntersect = intersect(this.mode.plane, true);
        this.pointStart.copy(planeIntersect.point);
    }

    onPointerMove(cb: (delta: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo) {
        switch (this.mode.state) {
            case 'X':
            case 'Y':
            case 'Z':
            case 'XY':
            case 'YZ':
            case 'XZ':
                const planeIntersect = intersect(this.mode.plane, true);
                if (!planeIntersect) return;
                this.pointEnd.copy(planeIntersect.point);

                cb(this.pointEnd.sub(this.pointStart).multiply(this.mode.multiplicand));
                break;
            default:
                throw this.mode;
        }
    }

    update(camera: THREE.Camera) {
        let factor;
        if (camera instanceof THREE.OrthographicCamera) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else if (camera instanceof THREE.PerspectiveCamera) {
            factor = this.position.distanceTo(camera.position) * Math.min(1.9 * Math.tan(Math.PI * camera.fov / 360) / camera.zoom, 7);
        } else {
            throw "wtf";
        }

        this.handle.scale.set(1, 1, 1).multiplyScalar(factor * 1 / 7);
    }
}

type Mode = {
    state: 'X' | 'Y' | 'Z' | 'XY' | 'YZ' | 'XZ' | 'screen';
    plane: THREE.Mesh;
    multiplicand: THREE.Vector3;
}