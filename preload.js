'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mmmAPI', {
  openFile:    ()        => ipcRenderer.invoke('open-file'),
  saveFile:    (content) => ipcRenderer.invoke('save-file',    { content }),
  saveFileAs:  (content) => ipcRenderer.invoke('save-file-as', { content }),
  runCode:     (code)    => ipcRenderer.invoke('run-code', code),
  onAction:    (cb) => ipcRenderer.on('action',      (_, action, data) => cb(action, data)),
  onFileOpened:(cb) => ipcRenderer.on('file-opened', (_, data)         => cb(data)),
});
