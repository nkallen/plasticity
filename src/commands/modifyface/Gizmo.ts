import { CircleGeometry } from "../../Util";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Editor } from '../../Editor';
import * as visual from "../../VisualModel";
import { AbstractGizmo, Pointer, Intersector, MovementInfo } from "../AbstractGizmo";

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

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2)
const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false })

export class ModifyFaceGizmo extends AbstractGizmo<(offset: THREE.Vector3) => void> {
    private readonly pointStart: THREE.Vector3;
    private readonly pointEnd: THREE.Vector3;
    private readonly origin: THREE.Vector3;
    private readonly plane: THREE.Mesh;
    private readonly circle: THREE.Mesh;

    constructor(editor: Editor, object: visual.SpaceItem, origin: THREE.Vector3, normal: THREE.Vector3) {
        const sphere = new THREE.Mesh(sphereGeometry, matYellow);
        sphere.position.set(0, 1, 0);
        const line = new THREE.Line(lineGeometry, matLineYellow);
        const picker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
        picker.position.set(0, 0.6, 0);

        const geometry = new LineGeometry();
        geometry.setPositions(CircleGeometry(1, 32));
        const circle = new Line2(geometry, editor.materials.gizmo());
        circle.renderOrder = Infinity;

        const handle = new THREE.Group();
        handle.add(sphere, line, circle);
        super(editor, object, { handle: handle, picker: picker });

        this.position.copy(origin);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane.lookAt(1, 0, 0);
        this.pointStart = new THREE.Vector3();
        this.pointEnd = new THREE.Vector3();
        this.origin = origin;

        this.circle = circle;

        this.add(this.plane);
    }

    onPointerDown(intersect: Intersector) {
        const planeIntersect = intersect(this.plane, true);
        this.pointStart.copy(planeIntersect.point).sub(this.origin);
    }

    onPointerMove(cb: (offset: THREE.Vector3) => void, intersect: Intersector, info: MovementInfo) {
        const planeIntersect = intersect(this.plane, true);
        if (!planeIntersect) return;
        this.pointEnd.copy(planeIntersect.point).sub(this.origin);
        cb(this.pointEnd.sub(this.pointStart));
    }

    update(camera: THREE.Camera) {
        this.circle.quaternion.copy(camera.quaternion);
    }
}