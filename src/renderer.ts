import Stats from 'stats.js';
import * as THREE from 'three';
import '../build/Release/c3d.dll'; // On windows, this will copy the file into the webpack bundle
import c3d from '../build/Release/c3d.node';
// import '../build/Release/libc3d.dylib'; // On mac
import '../lib/c3d/enums';
import license from '../license-key.json';
import * as cmd from './commands/GeometryCommands';
import Creators from './components/creators/Creators';
import Dialog from './components/dialog/Dialog';
import NumberScrubber from './components/dialog/NumberScrubber';
import Header from './components/header/Header';
import Modifiers from './components/modifiers/Modifiers';
import './components/pane/Pane';
import registerDefaultCommands from './components/toolbar/icons';
import Palette from './components/toolbar/Palette';
import Toolbar from './components/toolbar/Toolbar';
import SnapOverlay from './components/viewport/SnapOverlay';
import Viewport from './components/viewport/Viewport';
import ViewportHeader from './components/viewport/ViewportHeader';
import './css/index.less';
import keymap from "./default-keymap";
import { HotReloadingEditor } from './editor/Editor';

c3d.Enabler.EnableMathModules(license.name, license.key);

const editor = new HotReloadingEditor();
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

editor.keymaps.add('/default', keymap);
editor.registry.add("ispace-workspace", {
});

registerDefaultCommands(editor);

requestAnimationFrame(function loop() {
    stats.update();
    requestAnimationFrame(loop)
});

Header(editor);
Toolbar(editor);
Palette(editor);
Viewport(editor);
Creators(editor);
Modifiers(editor);
NumberScrubber(editor);
Dialog(editor);
ViewportHeader(editor);
SnapOverlay(editor);
