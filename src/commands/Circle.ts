import { GeometryDatabase } from '../GeometryDatabase';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../Editor';
import MaterialDatabase from '../MaterialDatabase';
import { GeometryFactory } from './Factory';

export default class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: Line2;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.mesh = new Line2(new LineGeometry(), materials.line());
        this.db.scene.add(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const segmentCount = 32;
        const vertices = new Float32Array((segmentCount + 1) * 3);

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
        this.db.scene.remove(this.mesh);
        const center = new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z);
        const circle = c3d.ActionCurve3D.Arc(center, [], true, 0, this.radius, this.radius);
        this.db.addItem(new c3d.SpaceInstance(circle));

        return super.commit();
    }

    cancel() {
        this.db.scene.remove(this.mesh);
    }
}