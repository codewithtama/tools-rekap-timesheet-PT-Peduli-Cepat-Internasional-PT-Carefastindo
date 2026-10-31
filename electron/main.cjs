/**
 * Electron Main Process
 * Rekap Timesheet Carefast & PCI Desktop Application
 */

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Tools Rekap Timesheet - Carefast & PCI',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  let isWindowShown = false;
  const showWindow = () => {
    if (!isWindowShown && mainWindow && !mainWindow.isDestroyed()) {
      isWindowShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  // Primary event when DOM is painted
  mainWindow.once('ready-to-show', showWindow);

  // Fallback safety timer: show window within 1.5s regardless of external asset delays
  const fallbackTimer = setTimeout(showWindow, 1500);

  // Load production Vite build
  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    clearTimeout(fallbackTimer);
    showWindow();
  });

  // Ensure external links open in system default browser (not inside the app window)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    clearTimeout(fallbackTimer);
    mainWindow = null;
  });
}

// Single instance lock to prevent launching multiple duplicate instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
