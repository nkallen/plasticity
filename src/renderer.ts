import Stats from 'stats.js';
import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import '../lib/c3d/enums';
import license from '../license-key.json';
import * as cmd from './commands/GeometryCommands';
import Creators from './components/creators/Creators';
import Dialog from './components/dialog/Dialog';
import NumberScrubber from './components/dialog/NumberScrubber';
import Modifiers from './components/modifiers/Modifiers';
import Outliner from './components/outliner/Outliner';
import './components/pane/Pane';
import TitleBar from './components/title-bar/TitleBar';
import Icon from './components/toolbar/Icon';
import registerDefaultCommands from './components/toolbar/icons';
import Palette from './components/toolbar/Palette';
import Toolbar from './components/toolbar/Toolbar';
import Tooltip from './components/tooltip/Tooltip';
import UndoHistory from './components/undo-history/UndoHistory';
import Keybindings from './components/viewport/Keybindings';
import SnapOverlay from './components/viewport/SnapOverlay';
import Viewport from './components/viewport/Viewport';
import ViewportHeader from './components/viewport/ViewportHeader';
import Prompt from './components/viewport/ViewportPrompt';
import './css/index.css';
import { Editor } from './editor/Editor';
import { loadKeymap } from './startup/LoadKeymap';
import { loadTheme } from './startup/LoadTheme';

c3d.Enabler.EnableMathModules(license.name, license.key);

loadTheme();

export const editor = new Editor();

editor.backup.load();
Object.defineProperty(window, 'editor', {
    value: editor,
    writable: false
}); // Make available to debug console

Object.defineProperty(window, 'THREE', {
    value: THREE,
    writable: false,
})

Object.defineProperty(window, 'cmd', {
    value: cmd,
    writable: false,
})

const stats = new Stats();
document.body.appendChild(stats.dom);
stats.dom.setAttribute('style', 'position: fixed; bottom: 0px; left: 0px; cursor: pointer; opacity: 0.9; z-index: 10000;');

loadKeymap();

registerDefaultCommands(editor);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

Icon(editor);
TitleBar(editor);
Toolbar(editor);
Keybindings(editor);
Palette(editor);
Viewport(editor);
Creators(editor);
Modifiers(editor);
NumberScrubber(editor);
Dialog(editor);
ViewportHeader(editor);
SnapOverlay(editor);
Prompt(editor);
Outliner(editor);
UndoHistory(editor);
Tooltip(editor);