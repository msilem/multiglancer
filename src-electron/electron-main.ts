import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import os from 'os';

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

let mainWindow: BrowserWindow | undefined;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      webSecurity: false, // Disable web security to prevent cross-origin iframe issues in Electron
      nodeIntegrationInSubFrames: true, // Allow preload script to run inside cross-origin game iframes
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });
  
  // Automatically save downloads to the Downloads folder without prompting
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    const downloadPath = path.join(app.getPath('downloads'), item.getFilename());
    item.setSavePath(downloadPath);
  });
  
  // Use a modern Android User-Agent instead of iPhone. 
  // Pragmatic Play often crashes/hangs if it sees an iPhone UA but cannot find iOS-specific touch/payment APIs.
  mainWindow.webContents.userAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";

  mainWindow.loadURL(process.env.APP_URL);

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-site-isolation-trials');

ipcMain.handle('capture-page', async (event, rect) => {
  if (!mainWindow) return null;
  const image = await mainWindow.webContents.capturePage(rect);
  return image.toDataURL();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    createWindow();
  }
});
