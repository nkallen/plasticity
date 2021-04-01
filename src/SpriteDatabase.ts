import * as THREE from "three";
import circleIcon from 'bootstrap-icons/icons/circle.svg';
import circleFillIcon from 'bootstrap-icons/icons/circle-fill.svg';

const textureloader = new THREE.TextureLoader();

const circle = textureloader.load(circleIcon);
const circleFill = textureloader.load(circleFillIcon);

const isNear = new THREE.Sprite(new THREE.SpriteMaterial({ map: circle, sizeAttenuation: false }));
const willSnap = new THREE.Sprite(new THREE.SpriteMaterial({ map: circleFill, sizeAttenuation: false }));

export class SpriteDatabase {
    isNear() {
        const result = isNear.clone();
        result.scale.set(0.01, 0.01, 0.01);
        return result;
    }

    willSnap() {
        const result = willSnap.clone();
        result.scale.set(0.01, 0.01, 0.01);
        return result;
    }
}

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