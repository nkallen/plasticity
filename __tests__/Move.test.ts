import signals from "signals";
import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../build/Release/c3d.node';
import MoveFactory from '../src/commands/Move';
import SphereFactory from '../src/commands/Sphere';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';

class FakeMaterials implements Required<MaterialDatabase> {
    get(o: c3d.Item): THREE.Material {
        return new THREE.Material();
    }
    line(o?: c3d.SpaceInstance): LineMaterial {
        return new LineMaterial();
    }
    lineDashed(): LineMaterial {
        return new LineMaterial();
    }
    setResolution(width: number, height: number): void {
    }
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

class FakeSprites implements Required<SpriteDatabase> {
    isNear(): THREE.Object3D {
        throw new Error("Method not implemented.");
    }
    willSnap(): THREE.Object3D {
        throw new Error("Method not implemented.");
    }
}

let db: GeometryDatabase;
let move: MoveFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let sigs: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    sigs = {
        objectAdded: new signals.Signal(),
        objectRemoved: new signals.Signal(),
        objectSelected: new signals.Signal(),
        objectDeselected: new signals.Signal(),
        objectHovered: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        commandUpdated: new signals.Signal(),
        commandCommitted: new signals.Signal(),
        pointPickerChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }
    db = new GeometryDatabase(materials, sigs);
    move = new MoveFactory(db, materials, sigs);
})

describe('update', () => {
    test('moves the visual object', () => {
        const item = new visual.Solid();
        move.item = item;
        move.p1 = new THREE.Vector3();
        move.p2 = new THREE.Vector3(1, 0, 0);
        expect(item.position).toEqual(new THREE.Vector3(0, 0, 0));
        move.update();
        expect(item.position).toEqual(new THREE.Vector3(1, 0, 0));
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        expect(db.scene.children.length).toBe(0);
        const makeSphere = new SphereFactory(db, materials, sigs);
        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        makeSphere.commit();
        expect(db.scene.children.length).toBe(1);
        let item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
        
        move.item = item;
        move.p1 = new THREE.Vector3();
        move.p2 = new THREE.Vector3(1, 0, 0);
        expect(item.position).toEqual(new THREE.Vector3(0, 0, 0));
        item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
    })
})