'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');
const { Interpreter } = require('./src/mmm-interpreter.js');

let mainWindow;
let currentFilePath = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'mmm_L',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  setupMenu();
}

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const send  = (action) => mainWindow.webContents.send('action', action);

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New File',       accelerator: 'CmdOrCtrl+N',       click: () => send('new') },
        { label: 'Open...',        accelerator: 'CmdOrCtrl+O',       click: () => openFile() },
        { type: 'separator' },
        { label: 'Save',           accelerator: 'CmdOrCtrl+S',       click: () => send('save') },
        { label: 'Save As...',     accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveAs') },
        { type: 'separator' },
        { label: 'Exit',           accelerator: isMac ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'Run',
      submenu: [
        { label: '▶ Run mmm Code', accelerator: 'F5',          click: () => send('run') },
        { label: 'Clear Terminal', accelerator: 'CmdOrCtrl+L', click: () => send('clear') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'mmm Programming Language Spec (Please Read)', accelerator: 'F1', click: () => send('help') },
        { type: 'separator' },
        {
          label: 'About mmm_L',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title:   'About mmm_L',
              message: 'mmm_L v1.0.0',
              detail:  'IDE for mmm Programming Language\n\nmmm Programming Language is a Korean esoteric programming language.\nThe fact that you are using this IDE is already impressive.',
              type:    'info',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── 파일 열기 ────────────────────────────────────
async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:   'Open File',
    filters: [
      { name: 'mmm Files', extensions: ['mmm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths.length) return;

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    currentFilePath = filePath;
    mainWindow.setTitle(`${path.basename(filePath)} - mmm_L`);
    mainWindow.webContents.send('file-opened', { path: filePath, content });
  } catch (err) {
    dialog.showErrorBox('Error', `Cannot open file: ${err.message}`);
  }
}

// ─── IPC 핸들러 ───────────────────────────────────
ipcMain.handle('open-file', () => openFile());

ipcMain.handle('save-file', async (_, { content }) => {
  if (!currentFilePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title:       'Save File',
      defaultPath: 'untitled.mmm',
      filters:     [{ name: 'mmm Files', extensions: ['mmm'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled) return { success: false };
    currentFilePath = result.filePath;
  }
  try {
    fs.writeFileSync(currentFilePath, content, 'utf8');
    mainWindow.setTitle(`${path.basename(currentFilePath)} - mmm_L`);
    return { success: true, path: currentFilePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-file-as', async (_, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title:       'Save As',
    defaultPath: currentFilePath || 'untitled.mmm',
    filters:     [{ name: 'mmm Files', extensions: ['mmm'] }, { name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled) return { success: false };
  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    currentFilePath = result.filePath;
    mainWindow.setTitle(`${path.basename(currentFilePath)} - mmm_L`);
    return { success: true, path: currentFilePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('run-code', (_, code) => {
  const interp = new Interpreter();
  return interp.run(code);
});

// ─── 앱 생명주기 ──────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
