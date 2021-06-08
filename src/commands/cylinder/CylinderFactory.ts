import { GeometryFactory } from '../Factory'
import c3d from '../../../build/Release/c3d.node';
import * as THREE from "three";
import { EditorSignals } from '../../Editor'
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryDatabase } from '../../GeometryDatabase';

export default class CylinderFactory extends GeometryFactory {
    base!: THREE.Vector3;
    radius!: THREE.Vector3;
    height!: THREE.Vector3;
    mesh: THREE.Line | THREE.Mesh;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);

        const geometry = new THREE.CylinderGeometry(0, 0, 0, 32);
        this.mesh = new THREE.Mesh(geometry, materials.mesh());
        this.mesh.up = new THREE.Vector3(0, 1, 0);
        this.db.temporaryObjects.add(this.mesh);
    }

    async doUpdate() {
        this.mesh.geometry.dispose();
        const radiusLength = this.base.distanceTo(this.radius);
        const heightLength = this.base.distanceTo(this.height);
        this.mesh.geometry = new THREE.CylinderGeometry(radiusLength, radiusLength, heightLength, 32);
        const direction = this.height.clone().sub(this.base);
        this.mesh.position.copy(this.base.clone().add(direction.multiplyScalar(0.5)));
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    }

    async doCommit() {
        this.db.temporaryObjects.remove(this.mesh);
        const n = this.height.clone().sub(this.base);
        const z = -(n.x + n.y) / n.z
        const radius = this.base.clone().add(new THREE.Vector3(1, 1, z).normalize().multiplyScalar(this.radius.distanceTo(this.base)));
        const points = [
            new c3d.CartPoint3D(this.base.x, this.base.y, this.base.z),
            new c3d.CartPoint3D(this.height.x, this.height.y, this.height.z),
            new c3d.CartPoint3D(radius.x, radius.y, radius.z),
        ];
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, names);
        return this.db.addItem(sphere);
    }

    doCancel() {
        this.db.temporaryObjects.remove(this.mesh);
    }
}