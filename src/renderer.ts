import Stats from 'stats.js';
import * as THREE from 'three';
// import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import '../build/Release/libc3d.dylib'; // On mac
import license from '../license-key.json';
import BoxFactory from './commands/box/Box';
import CurveFactory from './commands/curve/Curve';
import SphereFactory from './commands/sphere/Sphere';
import './css/index.less';
import { Editor } from './Editor';
import './Pane';
import Toolbar from './components/toolbar/Toolbar';
import Viewport from './Viewport';
import c3d from '../build/Release/c3d.node';
import './types/c3d-enum';
c3d.Enabler.EnableMathModules(license.name, license.key);

const editor = new Editor();
const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

import keymap from "./default-keymap";
editor.keymaps.add('/default', keymap);

import registerDefaultCommands from './default-commands';
registerDefaultCommands(editor);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

Toolbar(editor);
Viewport(editor);

const box = new BoxFactory(editor.db, editor.materials, editor.signals);
box.p1 = new THREE.Vector3();
box.p2 = new THREE.Vector3(1, 0, 0);
box.p3 = new THREE.Vector3(1, 1, 0);
box.p4 = new THREE.Vector3(1, 1, 1);
box.commit();

const makeSphere = new SphereFactory(editor.db, editor.materials, editor.signals);
makeSphere.center = new THREE.Vector3(0.5, 0.5, 1.25);
makeSphere.radius = 0.5;
makeSphere.commit();