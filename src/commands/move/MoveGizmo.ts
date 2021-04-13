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

const gizmoTranslate = {
    X: [
        [new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, - Math.PI / 2], null, 'fwd'],
        [new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, Math.PI / 2], null, 'bwd'],
        [new THREE.Line(lineGeometry, matLineRed)]
    ],
    Y: [
        [new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, 'fwd'],
        [new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], [Math.PI, 0, 0], null, 'bwd'],
        [new THREE.Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]]
    ],
    Z: [
        [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [Math.PI / 2, 0, 0], null, 'fwd'],
        [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [- Math.PI / 2, 0, 0], null, 'bwd'],
        [new THREE.Line(lineGeometry, matLineBlue), null, [0, - Math.PI / 2, 0]]
    ],
    XYZ: [
        [new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), matWhiteTransparent.clone() as THREE.MeshBasicMaterial), [0, 0, 0], [0, 0, 0]]
    ],
    XY: [
        [new THREE.Mesh(new THREE.PlaneGeometry(0.295, 0.295), matYellowTransparent.clone()), [0.15, 0.15, 0]],
        [new THREE.Line(lineGeometry, matLineYellow), [0.18, 0.3, 0], null, [0.125, 1, 1]],
        [new THREE.Line(lineGeometry, matLineYellow), [0.3, 0.18, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]
    ],
    YZ: [
        [new THREE.Mesh(new THREE.PlaneGeometry(0.295, 0.295), matCyanTransparent.clone()), [0, 0.15, 0.15], [0, Math.PI / 2, 0]],
        [new THREE.Line(lineGeometry, matLineCyan), [0, 0.18, 0.3], [0, 0, Math.PI / 2], [0.125, 1, 1]],
        [new THREE.Line(lineGeometry, matLineCyan), [0, 0.3, 0.18], [0, - Math.PI / 2, 0], [0.125, 1, 1]]
    ],
    XZ: [
        [new THREE.Mesh(new THREE.PlaneGeometry(0.295, 0.295), matMagentaTransparent.clone()), [0.15, 0, 0.15], [- Math.PI / 2, 0, 0]],
        [new THREE.Line(lineGeometry, matLineMagenta), [0.18, 0, 0.3], null, [0.125, 1, 1]],
        [new THREE.Line(lineGeometry, matLineMagenta), [0.3, 0, 0.18], [0, - Math.PI / 2, 0], [0.125, 1, 1]]
    ]
};

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });

export class MoveGizmo extends AbstractGizmo<(delta: THREE.Vector3) => void> {
    private readonly pointStart: THREE.Vector3;
    private readonly pointEnd: THREE.Vector3;

    constructor(editor: Editor, object: visual.SpaceItem, p1: THREE.Vector3) {
        const handle = new THREE.Group();
        const picker = new THREE.Group();
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
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.lookAt(0, 1, 0); plane.updateMatrixWorld();
            p.userData.mode = { state: 'X', plane, multiplicand: X } as Mode;
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
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.lookAt(0, 0, 1); plane.updateMatrixWorld();
            p.userData.mode = { state: 'Y', plane, multiplicand: Y } as Mode;
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
            const plane = new THREE.Mesh(planeGeometry, planeMaterial);
            plane.lookAt(0, 1, 0); plane.updateMatrixWorld();
            p.userData.mode = { state: 'Z', plane, multiplicand: Z } as Mode;
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
        console.log(picker);
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
                const planeIntersect = intersect(this.mode.plane, true);
                if (!planeIntersect) return;
                this.pointEnd.copy(planeIntersect.point);

                cb(this.pointEnd.sub(this.pointStart).multiply(this.mode.multiplicand));
                break;
            default:
                throw this.mode;
        }
    }
}

type Mode = {
    state: 'X' | 'Y' | 'Z' | 'XY' | 'YZ' | 'XZ' | 'screen';
    plane: THREE.Mesh;
    multiplicand: THREE.Vector3;
}