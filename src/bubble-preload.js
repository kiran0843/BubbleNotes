const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  moveWindow:  (x, y) => ipcRenderer.send('bubble-move', x, y),
  restoreMain: ()     => ipcRenderer.send('restore-from-bubble')
})
