import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../build/Release/c3d.node';
import * as THREE from "three";
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";

export class FakeMaterials implements Required<MaterialDatabase> {
    get(o: c3d.Item): THREE.Material {
        return new THREE.Material();
    }
    line(o?: c3d.SpaceInstance): LineMaterial {
        return new LineMaterial();
    }
    lineDashed(): LineMaterial {
        return new LineMaterial();
    }
    setResolution(size: THREE.Vector2): void {}
    point(o?: c3d.Item): THREE.Material {
        return new THREE.Material();
    }
    mesh(o?: c3d.Item | c3d.MeshBuffer, doubleSided?: boolean): THREE.Material {
        return new THREE.Material();
    }
    highlight(o:  c3d.TopologyItem | c3d.SpaceInstance): LineMaterial {
        return new LineMaterial();
    }
    lookup(o: c3d.TopologyItem): LineMaterial {
        return new LineMaterial();
    }
    hover(): LineMaterial {
        return new LineMaterial();
    }
}

export class FakeSprites implements Required<SpriteDatabase> {
    isNear(): THREE.Object3D {
        throw new Error("Method not implemented.");
    }
    willSnap(): THREE.Object3D {
        throw new Error("Method not implemented.");
    }
}
