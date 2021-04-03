import './css/index.less';

import Stats from 'stats.js';
import { Editor } from './Editor';
import './Pane';
import Toolbar from './Toolbar';
import Viewport from './Viewport';
// import registerDefaultCommands from './register-default-commands';
const editor = new Editor();
const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

import c3d from '../build/Release/c3d.node';
import './types/c3d-enum'
import license from '../license-key.json';
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
