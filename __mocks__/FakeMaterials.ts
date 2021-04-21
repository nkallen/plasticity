import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";

export class FakeMaterials implements Required<MaterialDatabase> {
    get(_o: c3d.Item): THREE.Material {
        return new THREE.Material();
    }
    line(_o?: c3d.SpaceInstance): LineMaterial {
        return new LineMaterial();
    }
    lineDashed(): LineMaterial {
        return new LineMaterial();
    }
    setResolution(_size: THREE.Vector2): void {}
    point(_o?: c3d.Item): THREE.Material {
        return new THREE.Material();
    }
    mesh(_o?: c3d.Item | c3d.MeshBuffer, _doubleSided?: boolean): THREE.Material {
        return new THREE.Material();
    }
    highlight(_o:  c3d.TopologyItem | c3d.SpaceInstance): LineMaterial {
        return new LineMaterial();
    }
    lookup(_o: c3d.TopologyItem): LineMaterial {
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
