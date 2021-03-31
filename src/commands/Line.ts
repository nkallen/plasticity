import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from './../Editor'

export default class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.scene.add(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const vertices = new Float32Array(2 * 3);
        vertices[0] = this.p1.x;
        vertices[1] = this.p1.y;
        vertices[2] = this.p1.z;

        vertices[3] = this.p2.x;
        vertices[4] = this.p2.y;
        vertices[5] = this.p2.z;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.mesh.geometry = geometry;

        return super.update();
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const line = c3d.ActionCurve3D.Segment(point1, point2);
        this.editor.addObject(new c3d.SpaceInstance(line));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}