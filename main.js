const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

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
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  setupMenu();
}

function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    {
      label: '파일(ㅍ)',
      submenu: [
        {
          label: '새 파일 (새로 시작하고 싶으시다면)',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('action', 'new'),
        },
        {
          label: '열기... (파일을 여시려면 여기)',
          accelerator: 'CmdOrCtrl+O',
          click: () => openFile(),
        },
        { type: 'separator' },
        {
          label: '저장 (안 저장하면 다 날아갑니다)',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('action', 'save'),
        },
        {
          label: '다른 이름으로 저장...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('action', 'saveAs'),
        },
        { type: 'separator' },
        {
          label: '종료 (도망치시겠습니까)',
          accelerator: isMac ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '실행(ㅅ)',
      submenu: [
        {
          label: '▶ mmm 코드 실행',
          accelerator: 'F5',
          click: () => mainWindow.webContents.send('action', 'run'),
        },
        {
          label: '출력 지우기',
          accelerator: 'CmdOrCtrl+L',
          click: () => mainWindow.webContents.send('action', 'clear'),
        },
      ],
    },
    {
      label: '도움말(ㄷ)',
      submenu: [
        {
          label: 'mmm 언어 명세서 (꼭 읽으세요)',
          accelerator: 'F1',
          click: () => mainWindow.webContents.send('action', 'help'),
        },
        { type: 'separator' },
        {
          label: 'mmm_L 정보',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'mmm_L 정보',
              message: 'mmm_L v1.0.0',
              detail:
                'mmm 언어를 위한 통합 개발 환경\n\n' +
                'mmm 언어는 대한민국이 낳은 위대한 난해 프로그래밍 언어입니다.\n' +
                '이 IDE를 쓰고 계신다는 것 자체가 이미 대단한 일입니다.',
              type: 'info',
              buttons: ['확인 (알겠습니다)'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '파일 열기 (mmm 파일을 선택하십시오)',
    filters: [
      { name: 'mmm 파일', extensions: ['mmm'] },
      { name: '모든 파일', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      currentFilePath = filePath;
      mainWindow.webContents.send('file-opened', { path: filePath, content });
      mainWindow.setTitle(`${path.basename(filePath)} - mmm_L`);
    } catch (err) {
      dialog.showErrorBox('오류', `파일을 열 수 없습니다: ${err.message}`);
    }
  }
}

ipcMain.handle('save-file', async (event, { content }) => {
  if (!currentFilePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '파일 저장',
      defaultPath: 'untitled.mmm',
      filters: [
        { name: 'mmm 파일', extensions: ['mmm'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
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

ipcMain.handle('save-file-as', async (event, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '다른 이름으로 저장',
    defaultPath: currentFilePath || 'untitled.mmm',
    filters: [
      { name: 'mmm 파일', extensions: ['mmm'] },
      { name: '모든 파일', extensions: ['*'] },
    ],
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

ipcMain.on('set-title', (event, filename) => {
  mainWindow.setTitle(filename ? `${filename} - mmm_L` : 'mmm_L');
});

ipcMain.on('reset-filepath', () => {
  currentFilePath = null;
});

// 렌더러에서 파일 열기 요청
ipcMain.on('open-file-request', () => {
  openFile();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
