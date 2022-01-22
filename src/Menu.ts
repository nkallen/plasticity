import { app, Menu, MenuItemConstructorOptions } from 'electron';
import { isMac } from './index';

export function buildMenu() {
    const template: MenuItemConstructorOptions[] = [];
    // { role: 'appMenu' }
    if (isMac) {
        template.push({
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }
    // { role: 'fileMenu' }
    template.push({
        label: 'File',
        submenu: [
            { label: 'New...', accelerator: "CommandOrControl+N", enabled: false },
            { label: 'Open...', accelerator: "CommandOrControl+O", enabled: false },
            { label: 'Save as...', accelerator: "CommandOrControl+S", enabled: false },
            // { label: 'Open Recent...' },

            isMac ? { role: 'close' } : { role: 'quit' }
        ]
    });
    // { role: 'editMenu' }
    if (isMac) {
        template.push({
            label: 'Edit',
            submenu: [
                { role: 'undo', accelerator: "CommandOrControl+Z", enabled: false },
                { role: 'redo', accelerator: "Shift+CommandOrControl+Z", enabled: false },
                { type: 'separator' },
                { role: 'delete', accelerator: "X", enabled: false },
                // { role: 'selectAll' },
            ]
        });
    } else {
        template.push({
            label: 'Edit',
            submenu: [
                { role: 'undo', accelerator: "CommandOrControl+Z", enabled: false },
                { role: 'redo', accelerator: "Shift+CommandOrControl+Z" , enabled: false},
                { label: 'Repeat last command', accelerator: "Shift+R", enabled: false },
                { type: 'separator' },
                { role: 'delete', accelerator: "X", enabled: false },
                { type: 'separator' },
                // { role: 'selectAll' }
            ]
        });
    }
    template.push({
        label: 'Selection',
        submenu: [
            { label: 'Hide selected', accelerator: "H", enabled: false },
            { label: 'Unhide hidden', accelerator: "Alt+H", enabled: false },
            { label: 'Hide everything other than selected', accelerator: "Shift+H", enabled: false },
            { type: 'separator' },
            { label: 'Focus camera on selected', accelerator: "/", enabled: false },
            { type: 'separator' },
            { label: 'Deselect all', accelerator: "Alt+A", enabled: false },
            { type: 'separator' },
            { label: 'Convert selection to points', accelerator: "Control+1", enabled: false },
            { label: 'Convert selection to edges', accelerator: "Control+2", enabled: false },
            { label: 'Convert selection to faces', accelerator: "Control+3", enabled: false },
            { label: 'Convert selection to solids', accelerator: "Control+4", enabled: false },
        ]
    });
    // { role: 'viewMenu' }
    template.push({
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    });
    // { role: 'windowMenu' }
    if (isMac) {
        template.push({
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'window' }
            ]
        });
    } else {
        template.push({
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { role: 'close' }
            ]
        });
    }
    template.push({
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click: async () => {
                    const { shell } = require('electron');
                    await shell.openExternal('https://electronjs.org');
                }
            }
        ]
    });
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

export function buildContextMenu() {
    
}
