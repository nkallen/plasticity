import * as THREE from "three";
import { Editor } from '../../Editor';
import * as visual from "../../VisualModel";
import { AbstractGizmo, Intersector, MovementInfo } from "../AbstractGizmo";

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

const matInvisible = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matInvisible.opacity = 0.15;
const matYellow = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matYellow.color.set(0xffff00);
const matLineYellow = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineYellow.color.set(0xffff00);

const sphereGeometry = new THREE.SphereGeometry(0.1);
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));

export class FilletGizmo extends AbstractGizmo<(radius: number) => void> {
    constructor(editor: Editor, object: visual.Edge, point: THREE.Vector3, normal: THREE.Vector3) {
        const sphere = new THREE.Mesh(sphereGeometry, matYellow);
        sphere.position.set(0, 1, 0);
        const line = new THREE.Line(lineGeometry, matLineYellow);
        const picker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
        picker.position.set(0, 0.6, 0);
        const handle = new THREE.Group();
        handle.add(sphere, line);
        super(editor, object, { handle: handle, picker: picker });

        this.position.copy(point);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    }

    onPointerDown(intersect: Intersector) {}
    
    onPointerMove(cb: (radius: number) => void, intersect: Intersector, info: MovementInfo) {
        cb(info.pointEnd2d.sub(info.pointStart2d).length());
    }

    // updateMatrixWorld() {
    // let factor;
    // if (this.camera.isOrthographicCamera) {
    //     factor = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    // } else {
    //     factor = this.worldPosition.distanceTo(this.cameraPosition) * Math.min(1.9 * Math.tan(Math.PI * this.camera.fov / 360) / this.camera.zoom, 7);
    // }

    // handle.scale.set(1, 1, 1).multiplyScalar(factor * this.size / 7);
    //     this.delta.position.copy(this.worldPositionStart);
    //     const tempVector = new THREE.Vector3();
    //     tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1);
    //     this.delta.scale.copy(tempVector);

    //     super.updateMatrixWorld();
    // }
}