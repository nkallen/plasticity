import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import '../lib/c3d/enums';
// import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import '../build/Release/libc3d.dylib'; // On mac
import license from '../license-key.json';
import BoxFactory from './commands/box/BoxFactory';
import SphereFactory from './commands/sphere/SphereFactory';
import Toolbar from './components/toolbar/Toolbar';
import './css/index.less';
import registerDefaultCommands from './default-commands';
import keymap from "./default-keymap";
import { Editor } from './Editor';
import './components/pane/Pane';
import Viewport from './components/viewport/Viewport';
c3d.Enabler.EnableMathModules(license.name, license.key);

const editor = new Editor();
const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

editor.keymaps.add('/default', keymap);
editor.registry.add("ispace-workspace", {

});

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