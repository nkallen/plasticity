import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from './../Editor'

export default class BoxFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3?: THREE.Vector3;
    p4?: THREE.Vector3;
    mesh: THREE.Line | THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        let geometry: THREE.BufferGeometry;
        if (this.p1 && this.p2 && !this.p3) {
            const vertices = new Float32Array(2 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        } else if (this.p1 && this.p2 && this.p3 && !this.p4) {
            const p1 = this.p1, p2 = this.p2, p3 = this.p3;

            const e1 = p2.clone().sub(p1);
            const n = p3.clone().sub(p2).cross(e1);
            const e2 = e1.clone().cross(n).divideScalar(e1.length()*e1.length()).add(p2);

            const vertices = new Float32Array(5 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            vertices[6] = e2.x;
            vertices[7] = e2.y;
            vertices[8] = e2.z;

            const p4 = e2.clone().sub(e1);
            vertices[9] = p4.x;
            vertices[10] = p4.y;
            vertices[11] = p4.z;

            vertices[12] = this.p1.x;
            vertices[13] = this.p1.y;
            vertices[14] = this.p1.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        } else if (this.p1 && this.p2 && this.p3 && this.p4) {
            const p1 = this.p1, p2 = this.p2, p3 = this.p3;

            const e1 = p2.clone().sub(p1);
            const n = p3.clone().sub(p2).cross(e1);
            const e2 = e1.clone().cross(n).divideScalar(e1.length()*e1.length()).add(p2);
            
            this.editor.scene.remove(this.mesh);
            this.mesh = new THREE.Mesh(this.mesh.geometry, this.editor.materialDatabase.mesh());
            this.editor.scene.add(this.mesh);
            const height = this.p4.clone().sub(p3).dot(n.clone().normalize());
            geometry = new THREE.BoxGeometry(p1.distanceTo(p2), e2.clone().sub(p2).length(), height);
            const direction = p2.clone().sub(p1);
            this.mesh.position.copy(p1.clone()
                .add(direction.clone().multiplyScalar(0.5))
                .add(n.clone().normalize().multiplyScalar(height*0.5))
                .add(e2.clone().sub(p2).multiplyScalar(0.5)));
            this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0), direction.normalize());
        } else {
            throw "wtf";
        }
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const point3 = new c3d.CartPoint3D(this.p3.x, this.p3.y, this.p3.z);
        const point4 = new c3d.CartPoint3D(this.p4.x, this.p4.y, this.p4.z);
        const points = [point1, point2, point3, point4];
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const box = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Block, names);
        this.editor.addObject(box);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}