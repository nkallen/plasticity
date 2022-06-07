import { app, BrowserWindow, crashReporter, dialog, ipcMain } from 'electron';
import window from 'electron-window-state';
import os from 'os';
import { buildMenu } from './Menu';
import { ConfigFiles } from './startup/ConfigFiles';
if (require('electron-squirrel-startup')) app.quit();

export const isMac = process.platform === 'darwin'

const idealNumberOfThreads = Math.max(4, Math.min(8, os.cpus().length / 2));
process.env.UV_THREADPOOL_SIZE = `${idealNumberOfThreads}`;
process.env.APP_VERSION = app.getVersion();

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

crashReporter.start({
    productName: 'plasticity',
    submitURL: 'https://submit.backtrace.io/blurbs/8ba2ca632371bdac451b9bef87af76923b0b61191ae04459f622260035ea8a3b/minidump',
    uploadToServer: true
});

ConfigFiles.create();

const createWindow = () => {
    const mainWindowState = window({
        defaultWidth: 1920,
        defaultHeight: 1080
    });

    const mainWindow = new BrowserWindow({
        vibrancy: 'under-window',
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        backgroundColor: '#1e1c1930',
        titleBarStyle: 'hiddenInset',
        frame: false,
        trafficLightPosition: { x: 22, y: 22 },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
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
        mainWindow.webContents.devToolsWebContents?.reload();
        mainWindow.webContents.reload();
    });

    buildMenu(mainWindow);
};

ipcMain.handle('reload', async (event, args) => {
    const window = BrowserWindow.fromWebContents(event.sender)!;
    window.webContents.forcefullyCrashRenderer()
    window.webContents.reload();
});

ipcMain.handle('show-open-dialog', async (event, args) => {
    return dialog.showOpenDialog(args);
});

ipcMain.handle('show-save-dialog', async (event, args) => {
    return dialog.showSaveDialog(args);
});

ipcMain.on('window-event', (event, eventName: String) => {
    const window = BrowserWindow.fromWebContents(event.sender)!;

    switch (eventName) {
        case 'window-minimize':
            window.minimize()
            break
        case 'window-maximize':
            window.isMaximized() ? window.unmaximize() : window.maximize()
            break
        case 'window-close':
            window.close();
            break
        case 'window-is-maximized':
            event.returnValue = window.isMaximized()
            break
        case 'window-reload':
            window.webContents.reload();
            break
        default:
            break
    }
});

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
