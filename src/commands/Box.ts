import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from './../Editor'

export default class BoxFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    p4!: THREE.Vector3;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Mesh(geometry, this.editor.materialDatabase.mesh());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        let geometry: THREE.BufferGeometry;
        const p1 = this.p1, p2 = this.p2, p3 = this.p3;

        const e1 = p2.clone().sub(p1);
        const n = p3.clone().sub(p2).cross(e1);
        const e2 = e1.clone().cross(n).divideScalar(e1.length() * e1.length()).add(p2);

        const height = this.p4.clone().sub(p3).dot(n.clone().normalize());
        geometry = new THREE.BoxGeometry(p1.distanceTo(p2), e2.clone().sub(p2).length(), height);
        const direction = p2.clone().sub(p1);
        this.mesh.position.copy(p1.clone()
            .add(direction.clone().multiplyScalar(0.5))
            .add(n.clone().normalize().multiplyScalar(height * 0.5))
            .add(e2.clone().sub(p2).multiplyScalar(0.5)));
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        let p1 = this.p1, p2 = this.p2, p3 = this.p3;
        const p4 = this.p4;

        const AB = p2.clone().sub(p1), BC = p3.clone().sub(p2);
        const cross = AB.cross(BC);
        if (cross.dot(p4) < 0) { 
            [p1, p2, p3] = [p3, p2, p1];
        }

        const points = [
            new c3d.CartPoint3D(p1.x, p1.y, p1.z),
            new c3d.CartPoint3D(p2.x, p2.y, p2.z),
            new c3d.CartPoint3D(p3.x, p3.y, p3.z),
            new c3d.CartPoint3D(p4.x, p4.y, p4.z)
        ]
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
        this.editor.addObject(box);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}