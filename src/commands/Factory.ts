import { Editor } from './../Editor'
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';

export abstract class GeometryFactory {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }
}

export class SphereFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.SphereGeometry(0, 8, 6, 0, Math.PI * 2, 0, Math.PI);

        this.mesh = new THREE.Mesh(geometry, this.editor.materialDatabase.mesh());
        this.editor.addObject(this.mesh);
    }

    update() {
        const geometry = new THREE.SphereGeometry(this.radius, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
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

export class CircleFactory extends GeometryFactory {
    center!: THREE.Vector3;
    radius!: number;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.CircleGeometry(0, 32);

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const segmentCount = 32;
        const vertices = new Float32Array(segmentCount * 3);

        for (let i = 0; i <= segmentCount; i++) {
            var theta = (i / segmentCount) * Math.PI * 2;
            vertices[i * 3] = Math.cos(theta) * this.radius;
            vertices[i * 3 + 1] = Math.sin(theta) * this.radius;
            vertices[i * 3 + 2] = 0;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.mesh.geometry = geometry;
        this.mesh.position.copy(this.center);
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const points = [new c3d.CartPoint3D(this.center.x + this.radius, this.center.y, this.center.z)];
        const center = new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z);
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const circle = c3d.ActionCurve3D.Arc(center, [], true, 0, this.radius, this.radius);
        this.editor.addObject(new c3d.SpaceInstance(circle));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}

export class CylinderFactory extends GeometryFactory {
    base!: THREE.Vector3;
    radius!: THREE.Vector3;
    height?: THREE.Vector3;
    mesh: THREE.Mesh;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.CylinderGeometry(0, 0, 0, 32);

        this.mesh = new THREE.Mesh(geometry, this.editor.materialDatabase.mesh());
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
            this.mesh.position.copy(this.base.clone().add(direction));
            this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        }
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        console.log(this.base, this.radius, this.height);
        const points = [
            new c3d.CartPoint3D(this.base.x, this.base.y, this.base.z),
            new c3d.CartPoint3D(this.height.x, this.height.y, this.height.z),
            new c3d.CartPoint3D(this.radius.x, this.radius.y, this.radius.z),
        ];
        const names = new c3d.SNameMaker(1, c3d.ESides.SideNone, 0);
        const sphere = c3d.ActionSolid.ElementarySolid(points, c3d.ElementaryShellType.Cylinder, names);
        this.editor.addObject(sphere);
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}