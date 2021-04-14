import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryFactory } from '../Factory';

export default class CurveFactory extends GeometryFactory {
    points = new Array<THREE.Vector3>();
    private mesh: Line2;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.mesh = new Line2(new LineGeometry(), materials.line());
        this.db.scene.add(this.mesh);
    }

    update() {
        const { points, mesh } = this;

        this.mesh.geometry.dispose();
        const vertices = new Float32Array(points.length * 3);
        for (const [i, point] of points.entries()) {
            vertices[i * 3] = point.x;
            vertices[i * 3 + 1] = point.y;
            vertices[i * 3 + 2] = point.z;
        }

        const geometry = new LineGeometry();
        geometry.setPositions(vertices);
        this.mesh.geometry = geometry;

        return super.update();
    }

    commit() {
        const { points, mesh } = this;
        this.db.scene.remove(mesh);

        const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
        const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, c3d.SpaceType.Hermit3D);
        this.db.addItem(new c3d.SpaceInstance(curve));

        return super.commit();
    }

    cancel() {
        this.db.scene.remove(this.mesh);
        return super.cancel();
    }
}