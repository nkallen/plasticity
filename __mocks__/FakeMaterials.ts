import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from "../src/editor/MaterialDatabase";
import { SpriteDatabase } from "../src/editor/SpriteDatabase";

const line = new LineMaterial();
const highlight = new LineMaterial();
const hover = new LineMaterial();
const mesh = new THREE.Material();
const surface = new THREE.Material();
const region = new THREE.Material();
const controlPoint = new THREE.PointsMaterial();
controlPoint.userData.resolution = new THREE.Vector2(1, 1);

export class FakeMaterials implements MaterialDatabase {
    get(_o: any) { return new THREE.Material() }
    line(_o?: any) { return line }
    lineDashed() { return new LineMaterial() }
    point(_o?: any) { return new THREE.Material() }
    mesh(_o?: any) { return mesh }
    surface(_o?: any) { return surface }
    controlPoint() { return controlPoint }
    region() { return region }

    highlight(o: c3d.Edge): LineMaterial;
    highlight(o: c3d.Curve3D): LineMaterial;
    highlight(o: c3d.Face): THREE.Material;
    highlight(o: c3d.PlaneInstance): THREE.Material;
    highlight(o: c3d.SpaceInstance): LineMaterial;
    highlight(o: number): THREE.Color;
    highlight(o: any): THREE.Material | THREE.Color { return highlight }

    lookup(o: c3d.Edge): LineMaterial;
    lookup(o: c3d.Curve3D): LineMaterial;
    lookup(o: c3d.Face): THREE.Material;
    lookup(o: c3d.SpaceInstance): LineMaterial;
    lookup(o: c3d.TopologyItem | c3d.Curve3D | c3d.SpaceInstance): THREE.Material {
        return o instanceof c3d.Edge ? line : mesh;
    }

    hover(o: c3d.Edge): LineMaterial;
    hover(o: c3d.Curve3D): LineMaterial;
    hover(o: c3d.SpaceInstance): LineMaterial;
    hover(o: c3d.Face): THREE.Material;
    hover(o: c3d.PlaneInstance): THREE.Material;
    hover(o: c3d.TopologyItem): THREE.Material;
    hover(o: c3d.Item): THREE.Material;
    hover(o: number): THREE.Color;
    hover(o: any): THREE.Material | THREE.Color {
        return hover
    }

    setResolution(_size: THREE.Vector2) { }
}

const isNear = new THREE.Sprite();
const willSnap = new THREE.Sprite();

export class FakeSprites implements SpriteDatabase {
    isNear() { return isNear }
    willSnap() { return willSnap }
}
