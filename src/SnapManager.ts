import * as THREE from "three";

export abstract class Snap {
    snapper: THREE.Object3D;
    picker: THREE.Object3D
    abstract project(intersection: THREE.Intersection): THREE.Vector3;

    configure() {
        this.snapper.userData.snap = this;
        this.picker.userData.snap = this;
        return this;
    }
}

export class OriginSnap extends Snap {
    snapper = new THREE.Mesh(new THREE.SphereGeometry(0.2));
    picker = new THREE.Mesh(new THREE.SphereGeometry(0.5));

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return new THREE.Vector3();
    }
}

export class AxisSnap extends Snap {
    constructor(n: THREE.Vector3) {
        super();
        n = n.normalize().multiplyScalar(1000);
        const points = [-n.x, -n.y, -n.z, n.x, n.y, n.z];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.snapper = new THREE.Line(geometry);
        this.picker = this.snapper;
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return intersection.point;
    }
}