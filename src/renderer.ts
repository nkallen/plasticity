import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
// import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import '../build/Release/libc3d.dylib'; // On mac
import '../lib/c3d/enums';
import license from '../license-key.json';
import BoxFactory from './commands/box/BoxFactory';
import SphereFactory from './commands/sphere/SphereFactory';
import { CircleFactory } from './commands/circle/CircleFactory';
import Dialog from './components/modifiers/Dialog';
import Modifiers from './components/modifiers/Modifiers';
import NumberScrubber from './components/modifiers/NumberScrubber';
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

c3d.Enabler.EnableMathModules(license.name, license.key);

const editor = new Editor();
Object.defineProperty(window, 'editor', {
    value: editor,
    writable: false
}); // Make available to debug console

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
Modifiers(editor);
NumberScrubber(editor);
Dialog(editor);

// const box = new BoxFactory(editor.db, editor.materials, editor.signals);
// box.p1 = new THREE.Vector3();
// box.p2 = new THREE.Vector3(1, 0, 0);
// box.p3 = new THREE.Vector3(1, 1, 0);
// box.p4 = new THREE.Vector3(1, 1, 1);
// box.commit();

// const makeSphere = new SphereFactory(editor.db, editor.materials, editor.signals);
// makeSphere.center = new THREE.Vector3(0.5, 0.5, 1.25);
// makeSphere.radius = 0.5;
// makeSphere.commit();

// const makeCircle1 = new CircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle1.center = new THREE.Vector3(0, 0, 0);
// makeCircle1.radius = 1;
// makeCircle1.commit();

// const makeCurve1 = new CurveFactory(editor.db, editor.materials, editor.signals);
// makeCurve1.points.push(new THREE.Vector3());
// makeCurve1.points.push(new THREE.Vector3(-2, 4, 0));
// makeCurve1.commit();

// const makeCurve2 = new CurveFactory(editor.db, editor.materials, editor.signals);
// makeCurve2.points.push(new THREE.Vector3(-2, 4, 0));
// makeCurve2.points.push(new THREE.Vector3(0, 5, 0));
// makeCurve2.commit();

// const makeCircle2 = new CircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle2.center = new THREE.Vector3(0, 0.25, 0);
// makeCircle2.radius = 1;
// makeCircle2.commit();

// const makeCircle3 = new CircleFactory(editor.db, editor.materials, editor.signals);
// makeCircle3.center = new THREE.Vector3(0, -0.25, 0);
// makeCircle3.radius = 1;
// makeCircle3.commit();

const makeLine1 = new LineFactory(editor.db, editor.materials, editor.signals);
makeLine1.p1 = new THREE.Vector3();
makeLine1.p2 = new THREE.Vector3(1, 1, 0);
makeLine1.commit();

const makeLine2 = new LineFactory(editor.db, editor.materials, editor.signals);
makeLine2.p1 = new THREE.Vector3(1, 1, 0);
makeLine2.p2 = new THREE.Vector3(0, 1, 0);
makeLine2.commit();

const makeLine3 = new LineFactory(editor.db, editor.materials, editor.signals);
makeLine2.p1 = new THREE.Vector3(0, 1, 0);
makeLine2.p2 = new THREE.Vector3();
makeLine2.commit();

// const makePolyline = new CurveFactory(editor.db, editor.materials, editor.signals);
// makePolyline.type = c3d.SpaceType.Polyline3D;
// makePolyline.points.push(new THREE.Vector3());
// makePolyline.points.push(new THREE.Vector3(1, 1, 0));
// makePolyline.points.push(new THREE.Vector3(2, -1, 0));
// makePolyline.points.push(new THREE.Vector3(3, 1, 0));
// makePolyline.points.push(new THREE.Vector3(4, -1, 0));
// makePolyline.commit();