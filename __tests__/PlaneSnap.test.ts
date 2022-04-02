import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { PlaneSnap } from "../src/editor/snaps/PlaneSnap";
import { point2point, vec2vec } from "../src/util/Conversion";
import './matchers';

test("project axis aligned", () => {
    let plane: PlaneSnap, i;
    plane = new PlaneSnap(Z, origin);
    i = { point: origin } as THREE.Intersection;
    expect(plane.project(i).position).toApproximatelyEqual(origin);

    plane = new PlaneSnap(Z, Z);
    i = { point: Z } as THREE.Intersection;
    expect(plane.project(i).position).toApproximatelyEqual(Z);
});

test("project not axis aligned", () => {
    const normal = new THREE.Vector3(0.5, 0.5, Math.SQRT1_2);
    const plane = new PlaneSnap(normal, origin);
    let i: THREE.Intersection;
    i = { point: origin } as THREE.Intersection;
    expect(plane.project(i).position).toApproximatelyEqual(origin);
    const point = new THREE.Vector3(1, 1, -Math.SQRT2);
    i = { point } as THREE.Intersection;
    expect(plane.project(i).position).toApproximatelyEqual(point);
});

test("project not axis aligned, at origin, snap to grid", () => {
    const normal = new THREE.Vector3(0.5, 0.5, Math.SQRT1_2);
    const plane = new PlaneSnap(normal, origin);
    let i: THREE.Intersection;
    i = { point: origin } as THREE.Intersection;
    expect(plane.project(i, true).position).toApproximatelyEqual(origin);
    const point = new THREE.Vector3(1, 1, -Math.SQRT2);
    i = { point } as THREE.Intersection;
    expect(plane.project(i, true).position).toApproximatelyEqual(point);
});

test("project not axis aligned, not at origin, snap to grid", () => {
    const normal = new THREE.Vector3(0.5, 0.5, Math.SQRT1_2);
    const plane = new PlaneSnap(normal, new THREE.Vector3(1, 0, 0));
    plane.gridFactor = 0.1;
    let i: THREE.Intersection;
    i = { point: origin } as THREE.Intersection;
    expect(plane.project(i, true).position).toApproximatelyEqual(new THREE.Vector3(-0.207, 0.2071, Math.SQRT1_2));
    const point = new THREE.Vector3(1, 1, -Math.SQRT2);
    i = { point } as THREE.Intersection;
    expect(plane.project(i, true).position).toApproximatelyEqual(new THREE.Vector3(0.7928, 1.207, -Math.SQRT1_2));
});

test("isValid", () => {
    let plane: PlaneSnap;
    plane = new PlaneSnap(Z, origin);
    expect(plane.isValid(origin)).toBe(true);
    expect(plane.isValid(Z)).toBe(false);

    plane = new PlaneSnap(Z, Z);
    expect(plane.isValid(origin)).toBe(false);
    expect(plane.isValid(Z)).toBe(true);
});

test("placement", () => {
    let plane: PlaneSnap, placement: c3d.Placement3D;
    plane = new PlaneSnap(Z, origin);
    placement = plane.placement;
    expect(point2point(placement.GetOrigin())).toApproximatelyEqual(origin);
    expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(Z);

    plane = new PlaneSnap(Y, Z);
    placement = plane.placement;
    expect(point2point(placement.GetOrigin())).toApproximatelyEqual(Z);
    expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
});

test("orientation", () => {
    let plane: PlaneSnap, orientation: THREE.Quaternion;
    plane = new PlaneSnap(Z, origin);
    orientation = plane.orientation;
    expect(orientation).toHaveQuaternion(new THREE.Quaternion());

    plane = new PlaneSnap(Y, Z);
    orientation = plane.orientation;
    expect(orientation).toHaveQuaternion(new THREE.Quaternion(-Math.SQRT1_2));
});

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const origin = new THREE.Vector3();
