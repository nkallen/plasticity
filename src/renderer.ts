import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import license from '../license-key.json';
import BoxFactory from './commands/Box';
import './css/index.less';
import { Editor } from './Editor';
import './Pane';
import Toolbar from './Toolbar';
import './types/c3d-enum';
import Viewport from './Viewport';

// import registerDefaultCommands from './register-default-commands';
const editor = new Editor();
const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

c3d.Enabler.EnableMathModules(license.name, license.key);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

// import CommandRegistry from './CommandRegistry';

// const commandRegistry = new CommandRegistry();
// commandRegistry.attach(window);
// registerDefaultCommands(commandRegistry);

Toolbar(editor);
Viewport(editor);

const box = new BoxFactory(editor.db, editor.materials, editor.signals);
box.p1 = new THREE.Vector3();
box.p2 = new THREE.Vector3(1, 0, 0);
box.p3 = new THREE.Vector3(1, 1, 0);
box.p4 = new THREE.Vector3(1, 1, 1);
box.commit();

// const KeymapManager = requireDynamically('atom-keymap');
// console.log(KeymapManager);

// const keymaps = new KeymapManager();

// keymaps.defaultTarget = document.body
// document.addEventListener('keydown', function (event) {
//     keymaps.handleKeyboardEvent(event);
// });
// keymaps.add('/key/for/these/keymaps', {
//     "body": {
//         "up": "command:add-sphere",
//         "down": "core:move-down"
//     }
// });
// window.addEventListener('core:move-up', (event) => console.log('up', event));
// window.addEventListener('core:move-down', (event) => console.log('down', event));
