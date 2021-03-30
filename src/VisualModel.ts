import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../build/Release/c3d.node';

// This class hierarchy mirrors the c3d hierarchy into the THREE.js
// Object3D hierarchy

export class CurveEdge extends Line2 {
    constructor(name: c3d.Name, simpleName: number, geometry?: LineGeometry, material?: LineMaterial) {
        super(geometry, material);
        this.userData.name = name;
        this.userData.simpleName = simpleName;
    }
    
    get parentObject(): Item {
        return this.parent.parent as Item;
    }
}

export class Item extends THREE.Group {

}

export class Face extends THREE.Mesh {
    constructor(name: c3d.Name, simpleName: number, geometry?: THREE.BufferGeometry, material?: THREE.Material) {
        super(geometry, material);
        this.userData.name = name;
        this.userData.simpleName = name;
    }
}

export class Edge extends Line2 {
    constructor(name: c3d.Name, simpleName: number, geometry?: LineGeometry, material?: LineMaterial) {
        super(geometry, material);
        this.userData.name = name;
        this.userData.simpleName = simpleName;
    }
}

export class Curve3D extends THREE.Group {

}
