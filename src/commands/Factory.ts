import { Editor } from './../Editor'
import * as THREE from "three";
import porcelain from '../img/matcap-porcelain-white.jpg';
import c3d from '../../build/Release/c3d.node';

export abstract class GeometryFactory {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }
}

export class SphereFactory extends GeometryFactory {
    center: THREE.Vector3;
    radius: number;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.SphereGeometry(0, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        const material = new THREE.MeshMatcapMaterial();
        material.color = new THREE.Color(0x454545);

        const matcapTexture = new THREE.TextureLoader().load(porcelain);
        material.matcap = matcapTexture;
        this.mesh = new THREE.Mesh(geometry, material);
        this.editor.addObject(this.mesh);
    }

    update() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    commit() {
        this.editor.select(this.mesh);
        const points = [
            new c3d.CartPoint3D(0, 0, 0),
            new c3d.CartPoint3D(0, 0, 0),
            new c3d.CartPoint3D(0, 1, 0)
        ];
        const names = new c3d.SNameMaker(1, 0, 0);
        const sphereCreator = new c3d.ElementarySolid(points, 0, names);
        const shell = sphereCreator.CreateShell(0);
        console.log(shell);
        const solid = new c3d.Solid(shell, sphereCreator);
        console.log(solid);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}