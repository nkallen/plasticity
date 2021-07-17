import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../editor/Editor';
import { GeometryDatabase } from '../../editor/GeometryDatabase';
import MaterialDatabase from '../../editor/MaterialDatabase';
import { GeometryFactory } from '../Factory';
import * as visual from '../../editor/VisualModel';

export default class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    mesh: Line2;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.mesh = new Line2(new LineGeometry(), materials.line());
        this.db.temporaryObjects.add(this.mesh);
    }

    async doUpdate() {
        this.mesh.geometry.dispose();
        const vertices = new Float32Array(2 * 3);
        vertices[0] = this.p1.x;
        vertices[1] = this.p1.y;
        vertices[2] = this.p1.z;

        vertices[3] = this.p2.x;
        vertices[4] = this.p2.y;
        vertices[5] = this.p2.z;

        const geometry = new LineGeometry();
        geometry.setPositions(vertices);
        this.mesh.geometry = geometry;
    }

    async doCommit(): Promise<visual.SpaceInstance<visual.Curve3D>> {
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const line = c3d.ActionCurve3D.Segment(point1, point2);
        const result = await this.db.addItem(new c3d.SpaceInstance(line)) as visual.SpaceInstance<visual.Curve3D>;
        this.db.temporaryObjects.remove(this.mesh);
        return result;
    }

    doCancel() {
        this.db.temporaryObjects.remove(this.mesh);
    }
}