import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from '../../Editor';
import { GeometryDatabase } from "../../GeometryDatabase";
import MaterialDatabase from '../../MaterialDatabase';
import { GeometryFactory } from '../Factory';

export default class BoxFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    p4!: THREE.Vector3;
    mesh: THREE.Mesh;

    constructor(db: GeometryDatabase, materials: MaterialDatabase, signals: EditorSignals) {
        super(db, materials, signals);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Mesh(geometry, materials.mesh());
        this.db.scene.add(this.mesh);
    }

    async doUpdate() {
        this.mesh.geometry.dispose();
        const { BC, points: [p1, p2, p3, p4] } = this.clockwise();
        const AB = p2.clone().sub(p1);
        const CD = p4.clone().sub(p3);

        const geometry = new THREE.BoxGeometry(AB.length(), BC.length(), CD.length());
        // Box is centered, so uncenter it xyz:
        this.mesh.position.copy(p1.clone())
            .add(AB.multiplyScalar(0.5))
            .add(BC.multiplyScalar(0.5))
            .add(CD.multiplyScalar(0.5));
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), AB.normalize());
        this.mesh.geometry = geometry;
    }

    async doCommit() {
        this.db.scene.remove(this.mesh);
        const { points: [p1, p2, p3, p4] } = this.clockwise();

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z),
        ]
        const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);
        const box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
        return this.db.addItem(box);
    }

    private clockwise() {
        const { p1, p2 } = this;
        let { p3, p4 } = this;

        const AB = p2.clone().sub(p1)
        let BC = p3.clone().sub(p2);
        const heightNormal = AB.clone().cross(BC).normalize();
        const height = p4.clone().sub(p3).dot(heightNormal);

        const depthNormal = AB.clone().cross(heightNormal).normalize();
        const depth = p3.clone().sub(p2).dot(depthNormal);
        BC = depthNormal.multiplyScalar(depth)
        p3 = BC.clone().add(p2);

        p4 = heightNormal.multiplyScalar(height).add(p3);
        if (height < 0) return { BC, points: [p2, p1, p3, p4] }
        else return { BC, points: [p1, p2, p3, p4] }
    }

    doCancel() {
        this.db.scene.remove(this.mesh);
    }
}