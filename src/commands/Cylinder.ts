import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from './../Editor'
import CircleFactory from './Circle';

export default class CylinderFactory extends GeometryFactory {
    base!: THREE.Vector3;
    radius!: THREE.Vector3;
    height?: THREE.Vector3;
    mesh: THREE.Line | THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.CylinderGeometry(0, 0, 0, 32);

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.mesh.up = new THREE.Vector3(0, 1, 0);
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        let geometry: THREE.BufferGeometry;
        if (this.height == null) {
            const segmentCount = 32;
            const vertices = new Float32Array(segmentCount * 3);
            const radius = this.base.distanceTo(this.radius);

            for (let i = 0; i <= segmentCount; i++) {
                var theta = (i / segmentCount) * Math.PI * 2;
                vertices[i * 3] = Math.cos(theta) * radius;
                vertices[i * 3 + 1] = Math.sin(theta) * radius;
                vertices[i * 3 + 2] = 0;
            }
            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            this.mesh.position.copy(this.base);
        } else {
            const radiusLength = this.base.distanceTo(this.radius);
            const heightLength = this.base.distanceTo(this.height);
            geometry = new THREE.CylinderGeometry(radiusLength, radiusLength, heightLength, 32);
            const direction = this.height.clone().sub(this.base);
            this.editor.scene.remove(this.mesh);
            this.mesh = new THREE.Mesh(this.mesh.geometry, this.editor.materialDatabase.mesh());
            this.editor.scene.add(this.mesh);
            this.mesh.position.copy(this.base.clone().add(direction.multiplyScalar(0.5)));
            this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        }
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const n = this.height.clone().sub(this.base);
        const z = -(n.x + n.y) / n.z
        const radius = this.base.clone().add(new THREE.Vector3(1,1,z).normalize().multiplyScalar(this.radius.distanceTo(this.base)));
        const points = [
            new c3d.CartPoint3D(this.base.x, this.base.y, this.base.z),
            new c3d.CartPoint3D(this.height.x, this.height.y, this.height.z),
            new c3d.CartPoint3D(radius.x, radius.y, radius.z),
        ];
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, names);
        this.editor.addObject(sphere);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}