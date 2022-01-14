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
            { label: 'New...' },
            { label: 'Open...' },
            { label: 'Open Recent...' },
            { role: 'redo' },

            isMac ? { role: 'close' } : { role: 'quit' }
        ]
    });
    // { role: 'editMenu' }
    if (isMac) {
        template.push({
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'delete' },
                { role: 'selectAll' },
            ]
        });
    } else {
        template.push({
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' }
            ]
        });
    }
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