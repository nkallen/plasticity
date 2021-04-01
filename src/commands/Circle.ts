import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from '../Editor'
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

export default class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: Line2;

    constructor(editor: Editor) {
        super(editor);
        this.mesh = new Line2(new LineGeometry(), this.editor.materialDatabase.line());
        this.editor.scene.add(this.mesh);
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
        const geometry = new LineGeometry();
        geometry.setPositions(vertices);
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);

        return super.update();
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