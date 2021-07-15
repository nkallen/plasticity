import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export function cart2vec(from: c3d.CartPoint3D): THREE.Vector3 {
    return new THREE.Vector3(from.x, from.y, from.z);
}

export function vec2cart(from: THREE.Vector3): c3d.CartPoint3D {
    return new c3d.CartPoint3D(from.x, from.y, from.z);
}