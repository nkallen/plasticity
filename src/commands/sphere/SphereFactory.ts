import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as THREE from "three";
import { EditorSignals } from '../../Editor'
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryDatabase } from '../../GeometryDatabase';

export default class SphereFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: THREE.Mesh;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);

        const geometry = new THREE.SphereGeometry(0, 8, 6, 0, Math.PI * 2, 0, Math.PI);

        this.mesh = new THREE.Mesh(geometry, materials.mesh());
        this.db.scene.add(this.mesh);
    }

    async doUpdate() {
        const geometry = new THREE.SphereGeometry(this.radius, 18, 12, 0, Math.PI * 2, 0, Math.PI);
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    async doCommit() {
        this.db.scene.remove(this.mesh);
        const points = [
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z),
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z + 1),
            new c3d.CartPoint3D(this.center.x + this.radius, this.center.y, this.center.z),
        ];
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        return this.db.addItem(sphere);
    }

    doCancel() {
        this.db.scene.remove(this.mesh);
    }
}
