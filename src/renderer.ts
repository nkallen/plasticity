import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
// import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import '../build/Release/libc3d.dylib'; // On mac
import '../lib/c3d/enums';
import license from '../license-key.json';
import { ThreePointBoxFactory } from './commands/box/BoxFactory';
import Creators from './components/creators/Creators';
import Dialog from './components/dialog/Dialog';
import NumberScrubber from './components/dialog/NumberScrubber';
import './components/pane/Pane';
import registerDefaultCommands from './components/toolbar/icons';
import Palette from './components/toolbar/Palette';
import Toolbar from './components/toolbar/Toolbar';
import SnapOverlay from './components/viewport/SnapOverlay';
import Viewport from './components/viewport/Viewport';
import ViewportHeader from './components/viewport/ViewportHeader';
import './css/index.less';
import keymap from "./default-keymap";
import { Editor } from './editor/Editor';

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
Palette(editor);
Viewport(editor);
Creators(editor);
NumberScrubber(editor);
Dialog(editor);
ViewportHeader(editor);
SnapOverlay(editor);

const { db, materials, signals } = editor;

// const makeBox = new ThreePointBoxFactory(db, materials, signals);
// makeBox.p1 = new THREE.Vector3();
// makeBox.p2 = new THREE.Vector3(1, 0, 0);
// makeBox.p3 = new THREE.Vector3(1, 1, 0);
// makeBox.p4 = new THREE.Vector3(1, 1, 1);
// makeBox.commit();