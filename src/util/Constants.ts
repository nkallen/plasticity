import * as THREE from "three";

export const freeze = <T>(x: T): T => Object.freeze(x);

export const origin = freeze(new THREE.Vector3());

export const identityMatrix = freeze(new THREE.Matrix4());

export const X = freeze(new THREE.Vector3(1, 0, 0));
export const Z = freeze(new THREE.Vector3(0, 0, 1));
export const Y = freeze(new THREE.Vector3(0, 1, 0));

export const _X = freeze(new THREE.Vector3(-1, 0, 0));
export const _Y = freeze(new THREE.Vector3(0, -1, 0));
export const _Z = freeze(new THREE.Vector3(0, 0, -1));
