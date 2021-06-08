import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import MaterialDatabase from '../../MaterialDatabase';
import { CircleGeometry } from '../../util/Util';
import { GeometryFactory } from '../Factory';

export default class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: Line2;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.mesh = new Line2(new LineGeometry(), materials.line());
        this.db.temporaryObjects.add(this.mesh);
    }

    async doUpdate() {
        this.mesh.geometry.dispose();
        const vertices = CircleGeometry(this.radius, 32);
        const geometry = new LineGeometry();
        geometry.setPositions(vertices);
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    async doCommit() {
        this.db.temporaryObjects.remove(this.mesh);
        const center = new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z);
        const circle = c3d.ActionCurve3D.Arc(center, [], true, 0, this.radius, this.radius);
        return this.db.addItem(new c3d.SpaceInstance(circle));
    }

    doCancel() {
        this.db.temporaryObjects.remove(this.mesh);
    }
}