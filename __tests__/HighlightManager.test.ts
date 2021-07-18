import * as THREE from 'three';
import BoxFactory from '../src/commands/box/BoxFactory';
import { CircleFactory } from '../src/commands/circle/CircleFactory';
import { EditorSignals } from '../src/editor/Editor';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { HighlightManager } from '../src/selection/HighlightManager';
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;

let solid: visual.Solid;
let circle: visual.SpaceInstance<visual.Curve3D>;
let region: visual.PlaneInstance<visual.Region>;

let highlighter: HighlightManager;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    highlighter = new HighlightManager(db);

    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;

    const makeCircle = new CircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
});

test('highlight & unhighlight topology items', () => {
    const face = solid.faces.get(0);
    expect(face.child.material).toBe(materials.mesh(face));
    highlighter.highlightTopologyItems([face.simpleName], x => materials.highlight(x));
    expect(face.child.material).toBe(materials.highlight(face));
    highlighter.unhighlightTopologyItems([face.simpleName]);
    expect(face.child.material).toBe(materials.mesh(face));
});

test('highlight & unhighlight items', () => {
    const line = circle.underlying.child;
    expect(line.material).toBe(materials.line(circle));
    highlighter.highlightItems([circle.simpleName], x => materials.highlight(x));
    expect(line.material).toBe(materials.highlight(circle));
    highlighter.unhighlightItems([circle.simpleName]);
    expect(line.material).toBe(materials.line(circle));
});