import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from '../Editor'

export default class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.CircleGeometry(0, 32);

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const segmentCount = 32;
        const vertices = new Float32Array(segmentCount * 3);

        for (let i = 0; i <= segmentCount; i++) {
            var theta = (i / segmentCount) * Math.PI * 2;
            vertices[i * 3] = Math.cos(theta) * this.radius;
            vertices[i * 3 + 1] = Math.sin(theta) * this.radius;
            vertices[i * 3 + 2] = 0;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const center = new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z);
        const circle = c3d.ActionCurve3D.Arc(center, [], true, 0, this.radius, this.radius);
        this.editor.addObject(new c3d.SpaceInstance(circle));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}