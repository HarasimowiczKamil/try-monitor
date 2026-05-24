const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getResults: () => ipcRenderer.invoke('get-results'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  onResultsUpdate: (callback) => {
    ipcRenderer.on('results-update', (_event, results) => callback(results))
  },
  onLogsUpdate: (callback) => {
    ipcRenderer.on('logs-update', (_event, entries) => callback(entries))
  },
})
