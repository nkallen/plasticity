import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
// import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import '../build/Release/libc3d.dylib'; // On mac
import '../lib/c3d/enums';
import license from '../license-key.json';
import { CenterBoxFactory, ThreePointBoxFactory } from './commands/box/BoxFactory';
import SphereFactory from './commands/sphere/SphereFactory';
import { CenterCircleFactory } from './commands/circle/CircleFactory';
import Dialog from './components/creators/Dialog';
import Creators from './components/creators/Creators';
import NumberScrubber from './components/creators/NumberScrubber';
import './components/pane/Pane';
import Toolbar from './components/toolbar/Toolbar';
import Palette from './components/toolbar/Palette';
import Viewport from './components/viewport/Viewport';
import './css/index.less';
import keymap from "./default-keymap";
import { Editor } from './editor/Editor';
import registerDefaultCommands from './components/toolbar/icons';
import CurveFactory from './commands/curve/CurveFactory';
import LineFactory from './commands/line/LineFactory';
import ViewportHeader from './components/viewport/ViewportHeader';
import { FaceExtrudeFactory } from './commands/extrude/ExtrudeFactory';
import CylinderFactory from './commands/cylinder/CylinderFactory';

c3d.Enabler.EnableMathModules(license.name, license.key);

const editor = new Editor();
editor.backup.load();
Object.defineProperty(window, 'editor', {
    value: editor,
    writable: false
}); // Make available to debug console

Object.defineProperty(window, 'THREE', {
    value: THREE,
    writable: false,
})

const stats = new Stats();
stats.showPanel(1);
// document.body.appendChild(stats.dom);

editor.keymaps.add('/default', keymap);
editor.registry.add("ispace-workspace", {

});

registerDefaultCommands(editor);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

Toolbar(editor);
Palette(editor);
Viewport(editor);
Creators(editor);
NumberScrubber(editor);
Dialog(editor);
ViewportHeader(editor);

const { db, materials, signals } = editor;

// const makeBox = new ThreePointBoxFactory(db, materials, signals);
// makeBox.p1 = new THREE.Vector3();
// makeBox.p2 = new THREE.Vector3(1, 0, 0);
// makeBox.p3 = new THREE.Vector3(1, 1, 0);
// makeBox.p4 = new THREE.Vector3(1, 1, 1);
// makeBox.commit()

// const makeSphere = new SphereFactory(editor.db, editor.materials, editor.signals);
// makeSphere.center = new THREE.Vector3();
// makeSphere.radius = 1;
// makeSphere.commit();

// const makeCylinder = new CylinderFactory(db, materials, signals);
// makeCylinder.base = new THREE.Vector3();
// makeCylinder.radius = new THREE.Vector3(0, 0.5, 0);
// makeCylinder.height = new THREE.Vector3(0, 0, 2);
// makeCylinder.commit();


// const makeCircle1 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle1.center = new THREE.Vector3(0, 0, 0);
// makeCircle1.radius = 1;
// makeCircle1.commit();

// const makeCurve1 = new CurveFactory(editor.db, editor.materials, editor.signals);
// makeCurve1.points.push(new THREE.Vector3(-3, -3, 0));
// makeCurve1.points.push(new THREE.Vector3(3, 3, 0));
// makeCurve1.commit();

// const makeCurve2 = new CurveFactory(editor.db, editor.materials, editor.signals);
// makeCurve2.points.push(new THREE.Vector3(-2, 4, 0));
// makeCurve2.points.push(new THREE.Vector3(0, 5, 0));
// makeCurve2.commit();

// const makeCircle2 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle2.center = new THREE.Vector3(0, 0.25, 0);
// makeCircle2.radius = 1;
// makeCircle2.commit();

// const makeCircle3 = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle3.center = new THREE.Vector3(0, -0.25, 0);
// makeCircle3.radius = 1;
// makeCircle3.commit();

// const makeLine1 = new LineFactory(editor.db, editor.materials, editor.signals);
// makeLine1.p1 = new THREE.Vector3();
// makeLine1.p2 = new THREE.Vector3(1, 1, 0);
// makeLine1.commit();

// const makeLine2 = new LineFactory(editor.db, editor.materials, editor.signals);
// makeLine2.p1 = new THREE.Vector3(1, 1, 0);
// makeLine2.p2 = new THREE.Vector3(0, 1, 0);
// makeLine2.commit();

// const makeLine3 = new LineFactory(editor.db, editor.materials, editor.signals);
// makeLine2.p1 = new THREE.Vector3(0, 1, 0);
// makeLine2.p2 = new THREE.Vector3();
// makeLine2.commit();

// const makePolyline = new CurveFactory(editor.db, editor.materials, editor.signals);
// makePolyline.type = c3d.SpaceType.Polyline3D;
// makePolyline.points.push(new THREE.Vector3());
// makePolyline.points.push(new THREE.Vector3(1, 1, 0));
// makePolyline.points.push(new THREE.Vector3(2, -1, 0));
// makePolyline.points.push(new THREE.Vector3(3, 1, 0));
// makePolyline.points.push(new THREE.Vector3(4, -1, 0));
// makePolyline.commit();