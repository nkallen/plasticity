import { app, BrowserWindow, crashReporter } from 'electron';
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

crashReporter.start({
    productName: 'ispace',
    submitURL: 'https://submit.backtrace.io/blurbs/8ba2ca632371bdac451b9bef87af76923b0b61191ae04459f622260035ea8a3b/minidump',
    uploadToServer: true
});

// This is required by atom-keymap
app.allowRendererProcessReuse = false

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

const createWindow = (): void => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 1400,
        width: 1000,
        x: 0,
        y: 0,
        show: false,
        webPreferences: {
            // preload: path.join(path.join(__dirname, 'preload.js')),
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true
        }
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-finish-load', () => {
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
