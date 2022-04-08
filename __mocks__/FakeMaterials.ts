import { BetterRaycastingPointsMaterial } from "../src/visual_model/VisualModelRaycasting";
import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from "../src/editor/MaterialDatabase";
import { MaterialMemento } from "../src/editor/History";

const line = new LineMaterial();
const highlight = new LineMaterial();
const hover = new LineMaterial();
const mesh = new THREE.Material();
const surface = new THREE.Material();
const region = new THREE.Material();
const controlPoint = new BetterRaycastingPointsMaterial();
controlPoint.userData.resolution = new THREE.Vector2(1, 1);

export class FakeMaterials implements MaterialDatabase {
    line(_o?: any) { return line }
    lineDashed() { return new LineMaterial() }
    point(_o?: any) { return new THREE.Material() }
    mesh() { return mesh }
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

    add(name: string, m: THREE.Material): number { return 1 }
    get(id: number) { return mesh }

    setResolution(_size: THREE.Vector2) { }

    saveToMemento(): MaterialMemento {
        return null as any;
    }
    restoreFromMemento(m: MaterialMemento): void {
    }
    validate(): void {
    }
    debug(): void {
    }
}
