import './css/index.css';

import { Editor } from './Editor';
import './Pane';
// import Toolbar from './atom-toolbar';
import Viewport from './Viewport';
// import registerDefaultCommands from './register-default-commands';
const editor = new Editor();
// import CommandRegistry from './CommandRegistry';

// const commandRegistry = new CommandRegistry();
// commandRegistry.attach(window);
// registerDefaultCommands(commandRegistry);

// Toolbar(editor);
Viewport(editor);

// function requireDynamically(path: String)
// {
//     path = path.split('\\').join('/'); // Normalize windows slashes
//     return eval(`require('${path}');`); // Ensure Webpack does not analyze the require statement
// }

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
