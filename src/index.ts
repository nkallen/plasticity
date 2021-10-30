if (require('electron-squirrel-startup')) app.quit();

import { app, BrowserWindow, crashReporter } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fse from 'fs-extra';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

crashReporter.start({
    productName: 'ispace',
    submitURL: 'https://submit.backtrace.io/blurbs/8ba2ca632371bdac451b9bef87af76923b0b61191ae04459f622260035ea8a3b/minidump',
    uploadToServer: true
});

// This is required by atom-keymap
app.allowRendererProcessReuse = false

process.env.PLASTICITY_HOME = path.join(os.homedir(), '.plasticity');
if (!fs.existsSync(process.env.PLASTICITY_HOME)) {
    fse.copySync(path.join(__dirname, 'dot-plasticity'), process.env.PLASTICITY_HOME);
}

const createWindow = (): void => {
    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            // preload: path.join(path.join(__dirname, 'preload.js')),
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
        }
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    mainWindow.webContents.on('did-finish-load', () => {
        // mainWindow.webContents.openDevTools();
        mainWindow.show();
    })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
