import { app, BrowserWindow, crashReporter, dialog, ipcMain } from 'electron';
if (require('electron-squirrel-startup')) app.quit();

export const isMac = process.platform === 'darwin'

import path from 'path';
import os from 'os';
import fs from 'fs';
import fse from 'fs-extra';
import { buildContextMenu, buildMenu } from './Menu';
import window from 'electron-window-state';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

crashReporter.start({
    productName: 'ispace',
    submitURL: 'https://submit.backtrace.io/blurbs/8ba2ca632371bdac451b9bef87af76923b0b61191ae04459f622260035ea8a3b/minidump',
    uploadToServer: true
});

process.env.PLASTICITY_HOME = path.join(os.homedir(), '.plasticity');
if (!fs.existsSync(process.env.PLASTICITY_HOME)) {
    fse.copySync(path.join(__dirname, 'dot-plasticity'), process.env.PLASTICITY_HOME);
}

const createWindow = () => {
    const mainWindowState = window({
        defaultWidth: 1920,
        defaultHeight: 1080
    });

    const mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,
        backgroundColor: '#2e2c29',
        titleBarStyle: 'hiddenInset',
        // frame: false,
        trafficLightPosition: { x: 12, y: 12 },
        webPreferences: {
            // preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
        }
    });
    // mainWindow.removeMenu();

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    mainWindowState.manage(mainWindow);

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
    });

    mainWindow.webContents.on('unresponsive', () => {
        mainWindow.webContents.forcefullyCrashRenderer();
        mainWindow.webContents.reload();
    });

};

ipcMain.handle('reload', async (event, args) => {
    BrowserWindow.getFocusedWindow()?.webContents.forcefullyCrashRenderer()
    BrowserWindow.getFocusedWindow()?.webContents.reload();
})

ipcMain.handle('show-open-dialog', async (event, args) => {
    return dialog.showOpenDialog(args);
})

ipcMain.handle('show-save-dialog', async (event, args) => {
    return dialog.showSaveDialog(args);
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (!isMac) app.quit();
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

buildMenu();
buildContextMenu();