import { Editor } from './../Editor'
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { Vector3 } from 'three';

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
        const center = new c3d.CartPoint3D(this.center.x, this.center.y, this.center.z);
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
        const radius = this.base.clone().add(new Vector3(1,1,z).normalize().multiplyScalar(this.radius.distanceTo(this.base)));
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

export class LineFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        const vertices = new Float32Array(2 * 3);
        vertices[0] = this.p1.x;
        vertices[1] = this.p1.y;
        vertices[2] = this.p1.z;

        vertices[3] = this.p2.x;
        vertices[4] = this.p2.y;
        vertices[5] = this.p2.z;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const line = c3d.ActionCurve3D.Segment(point1, point2);
        this.editor.addObject(new c3d.SpaceInstance(line));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}

export class RectFactory extends GeometryFactory {
    p1!: THREE.Vector3;
    p2!: THREE.Vector3;
    p3!: THREE.Vector3;
    mesh: THREE.Line;

    constructor(editor: Editor) {
        super(editor);
        const geometry = new THREE.BufferGeometry();

        this.mesh = new THREE.Line(geometry, this.editor.materialDatabase.line());
        this.editor.addObject(this.mesh);
    }

    update() {
        this.mesh.geometry.dispose();
        let geometry: THREE.BufferGeometry;
        if (this.p3 == null) {
            const vertices = new Float32Array(2 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        } else {
            const vertices = new Float32Array(5 * 3);
            vertices[0] = this.p1.x;
            vertices[1] = this.p1.y;
            vertices[2] = this.p1.z;

            vertices[3] = this.p2.x;
            vertices[4] = this.p2.y;
            vertices[5] = this.p2.z;

            vertices[6] = this.p3.x;
            vertices[7] = this.p3.y;
            vertices[8] = this.p3.z;

            const p4 = this.p3.clone().sub(this.p2).add(this.p1);
            vertices[9] = p4.x;
            vertices[10] = p4.y;
            vertices[11] = p4.z;

            vertices[12] = this.p1.x;
            vertices[13] = this.p1.y;
            vertices[14] = this.p1.z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        }
        this.mesh.geometry = geometry;
    }

    commit() {
        this.editor.scene.remove(this.mesh);
        const point1 = new c3d.CartPoint3D(this.p1.x, this.p1.y, this.p1.z);
        const point2 = new c3d.CartPoint3D(this.p2.x, this.p2.y, this.p2.z);
        const point3 = new c3d.CartPoint3D(this.p3.x, this.p3.y, this.p3.z);
        const p4 = this.p3.clone().sub(this.p2).add(this.p1);
        const point4 = new c3d.CartPoint3D(p4.x, p4.y, p4.z);
        const line = new c3d.Polyline3D([point1, point2, point3, point4], true);
        this.editor.addObject(new c3d.SpaceInstance(line));
    }

    cancel() {
        this.editor.scene.remove(this.mesh);
    }
}

export class BoxFactory extends GeometryFactory {
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