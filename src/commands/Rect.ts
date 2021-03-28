import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from './../Editor'

export default class RectFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        let geometry: THREE.BufferGeometry;
        if (this.p3 == null) {
            const vertices = new Float32Array(2 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        } else {
            const vertices = new Float32Array(5 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            vertices[6] = this.p3.x;
            vertices[7] = this.p3.y;
            vertices[8] = this.p3.z;

            const p4 = this.p3.clone().sub(this.p2).add(this.p1);
            vertices[9] = p4.x;
            vertices[10] = p4.y;
            vertices[11] = p4.z;

            vertices[12] = this.p1.x;
            vertices[13] = this.p1.y;
            vertices[14] = this.p1.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        }
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const point3 = new c3d.CartPoint3D(this.p3.x, this.p3.y, this.p3.z);
        const p4 = this.p3.clone().sub(this.p2).add(this.p1);
        const point4 = new c3d.CartPoint3D(p4.x, p4.y, p4.z);
        const line = new c3d.Polyline3D([point1, point2, point3, point4], true);
        this.editor.addObject(new c3d.SpaceInstance(line));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}