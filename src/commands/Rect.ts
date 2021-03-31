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
        this.editor.scene.add(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const geometry = new THREE.BufferGeometry();

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

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.mesh.geometry = geometry;

        return super.update();
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const p1 = this.p1, p2 = this.p2, p3 = this.p3;
        const p4 = p3.clone().sub(p2).add(p1);

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z)
        ]
        const line = new c3d.Polyline3D(points, true);
        this.editor.addObject(new c3d.SpaceInstance(line));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}