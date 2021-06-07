import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase, TemporaryObject } from '../../GeometryDatabase';
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryFactory } from '../Factory';

export default class CurveFactory extends GeometryFactory {
    readonly points = new Array<THREE.Vector3>();
    private mesh: Line2;
    type = c3d.SpaceType.Hermit3D;
    private temp?: TemporaryObject;

    nextPoint?: THREE.Vector3;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        this.mesh = new Line2(new LineGeometry(), materials.line());
        // this.db.scene.add(this.mesh);
    }

    async doUpdate() {
        const { points, nextPoint, mesh, type } = this;

        mesh.geometry.dispose();
        let length = points.length;
        if (nextPoint !== undefined) length++;

        const vertices = new Float32Array(length * 3);
        for (const [i, point] of points.entries()) {
            vertices[i * 3] = point.x;
            vertices[i * 3 + 1] = point.y;
            vertices[i * 3 + 2] = point.z;
        }
        const last = length - 1;
        if (nextPoint !== undefined) {
            vertices[last * 3] = nextPoint.x;
            vertices[last * 3 + 1] = nextPoint.y;
            vertices[last * 3 + 2] = nextPoint.z;
        }

        const geometry = new LineGeometry();
        geometry.setPositions(vertices);
        mesh.geometry = geometry;

        if (this.points.length === 0) return;

        let temp;
        try {
            const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
            if (nextPoint !== undefined) cartPoints.push(new c3d.CartPoint3D(nextPoint.x, nextPoint.y, nextPoint.z));
            const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, type);
            temp = await this.db.addTemporaryItem(new c3d.SpaceInstance(curve));
        } catch (e) {
            console.log(e);
        }
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { points, mesh, type } = this;
        mesh.geometry.dispose();
        this.db.scene.remove(mesh);
        this.temp?.cancel();

        const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
        const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, type);
        return this.db.addItem(new c3d.SpaceInstance(curve));
    }

    doCancel() {
        this.mesh.geometry.dispose();
        this.db.scene.remove(this.mesh);
        this.temp?.cancel();
    }
}