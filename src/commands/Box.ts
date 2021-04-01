import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from '../Editor'

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
        this.editor.scene.add(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const [p1, p2, p3] = this.clockwise(), p4 = this.p4;

        let AB = p2.clone().sub(p1), BC = p3.clone().sub(p2);
        const cross = BC.cross(AB);
        const CD = AB.clone().cross(cross).divideScalar(Math.pow(AB.length(), 2)).add(p2);
        const normal = cross.clone().normalize();

        const height = p4.clone().sub(p3).dot(normal);
        const geometry = new THREE.BoxGeometry(AB.length(), CD.clone().sub(p2).length(), height);
        // Box is centered, so uncenter it xyz:
        this.mesh.position.copy(p1.clone()
            .add(AB.clone().multiplyScalar(0.5))
            .add(normal.multiplyScalar(height * 0.5))
            .add(CD.clone().sub(p2).multiplyScalar(0.5)));
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), AB.clone().normalize());
        this.mesh.geometry = geometry;

        return super.update();
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const [p1, p2, p3] = this.clockwise(), p4 = this.p4;

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

    clockwise(): Array<THREE.Vector3> {
        let p1 = this.p1, p2 = this.p2, p3 = this.p3;
        const p4 = this.p4;

        let AB = p2.clone().sub(p1), BC = p3.clone().sub(p2);
        const normal = AB.cross(BC);
        if (normal.dot(p4) < 0) { 
            [p1, p2, p3] = [p3, p2, p1];
        }
        return [p1, p2, p3];
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}