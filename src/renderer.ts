import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import '../lib/c3d/enums';
import license from '../license-key.json';
import * as cmd from './commands/GeometryCommands';
import Clipboard from './components/clipboard/Clipboard';
import Creators from './components/creators/Creators';
import Dialog from './components/dialog/Dialog';
import NumberScrubber from './components/dialog/NumberScrubber';
import Prompt from './components/dialog/Prompt';
import Menu from './components/menu/Menu';
import Outliner from './components/outliner/Outliner';
import './components/pane/Pane';
import Planes from './components/planes/Planes';
import Snaps from './components/snaps/Snaps';
import Stats from './components/stats/Stats';
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
import './css/index.css';
import { Editor, supportedExtensions } from './editor/Editor';
import { ConfigFiles } from './startup/ConfigFiles';

c3d.Enabler.EnableMathModules(license.name, license.key);

ConfigFiles.loadTheme();
ConfigFiles.loadSettings();

export const editor = new Editor();

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

ConfigFiles.loadKeymap(editor.keymaps);

registerDefaultCommands(editor);

Icon(editor);
TitleBar(editor);
Toolbar(editor);
Keybindings(editor);
Palette(editor);
Viewport(editor);
Creators(editor);
NumberScrubber(editor);
Dialog(editor);
ViewportHeader(editor);
SnapOverlay(editor);
Prompt(editor);
Outliner(editor);
UndoHistory(editor);
Tooltip(editor);
Stats(editor);
Snaps(editor);
Planes(editor);
Clipboard(editor);
Menu(editor);

editor.backup.load();

const res = new RegExp(`\\.${supportedExtensions.join('|')}$`, 'i')

document.addEventListener('drop', e => {
    e.preventDefault();
    if (e.dataTransfer === null) return;
    const files = [];
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i].path;
        if (!res.test(file)) continue;
        files.push(file);
    }
    editor.import(files);
});

document.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
});
