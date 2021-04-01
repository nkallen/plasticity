import { GeometryFactory } from './Factory'
import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import { Editor } from '../Editor'

export default class SphereFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.SphereGeometry(0, 8, 6, 0, Math.PI * 2, 0, Math.PI);

        this.mesh = new THREE.Mesh(geometry, this.editor.materialDatabase.mesh());
        this.editor.scene.add(this.mesh);
    }

    update() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);

        return super.update();
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const points = [
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z),
            new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z + 1),
            new c3d.CartPoint3D(this.center.x + this.radius, this.center.y, this.center.z),
        ];
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Sphere, names);
        this.editor.addObject(sphere);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}
