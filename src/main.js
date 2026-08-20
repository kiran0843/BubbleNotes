const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let bubbleWindow
let tray

const notesPath   = path.join(app.getPath('userData'), 'notes.json')
const archivePath = path.join(app.getPath('userData'), 'archive.json')
// Legacy path for migration
const legacyTodosPath = path.join(app.getPath('userData'), 'todos.json')

function loadNotes() {
  try {
    if (fs.existsSync(notesPath)) {
      return JSON.parse(fs.readFileSync(notesPath, 'utf8'))
    }
    // Migrate from old todos.json if it exists
    if (fs.existsSync(legacyTodosPath)) {
      const todos = JSON.parse(fs.readFileSync(legacyTodosPath, 'utf8'))
      const now = new Date().toISOString()
      const migrated = todos.map(t => ({
        id: t.id,
        title: '',
        content: t.text || '',
        color: t.urgent ? 'pink' : 'yellow',
        date: t.deadline || t.completedAt || now.slice(0, 10),
        pinned: !!t.urgent,
        createdAt: now,
        updatedAt: now
      }))
      saveNotes(migrated)
      return migrated
    }
  } catch (e) {}
  return []
}

function saveNotes(notes) {
  fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2), 'utf8')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 520,
    minWidth: 280,
    minHeight: 380,
    frame: false,           // Frameless window
    transparent: true,      // Transparent background
    alwaysOnTop: true,      // Always on top
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  // Remember window position
  const Store = require('./store')
  const store = new Store()
  const bounds = store.get('windowBounds')
  if (bounds) {
    mainWindow.setBounds(bounds)
  }

  mainWindow.on('moved', () => {
    store.set('windowBounds', mainWindow.getBounds())
  })
  mainWindow.on('resized', () => {
    store.set('windowBounds', mainWindow.getBounds())
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  // Use empty icon (can be replaced with real icon)
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow && mainWindow.show() },
    { label: 'Hide', click: () => mainWindow && mainWindow.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setToolTip('BubbleNotes')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show()
  }
  createWindow()
  // createTray() // Can be enabled when icon assets are provided
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})

// IPC: Read/write notes
ipcMain.handle('load-notes', () => loadNotes())
ipcMain.handle('save-notes', (_, notes) => saveNotes(notes))

// IPC: Window control
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize())
ipcMain.on('window-close', () => mainWindow && mainWindow.hide())
ipcMain.on('window-pin', (_, pinned) => {
  if (!mainWindow) return
  if (pinned) {
    if (process.platform === 'darwin') {
      mainWindow.setAlwaysOnTop(true, 'floating', 1)
    } else {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    }
  } else {
    mainWindow.setAlwaysOnTop(false)
  }
})

// IPC: Floating bubble
function getBubblePosition() {
  if (!mainWindow) return { x: 0, y: 0 }
  const bounds = mainWindow.getBounds()
  return {
    x: Math.round(bounds.x + bounds.width / 2 - 18),
    y: bounds.y
  }
}

ipcMain.on('minimize-to-bubble', () => {
  if (!mainWindow) return
  const pos = getBubblePosition()

  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    bubbleWindow = new BrowserWindow({
      width: 36,
      height: 36,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'bubble-preload.js')
      }
    })
    bubbleWindow.loadFile(path.join(__dirname, 'bubble.html'))
    bubbleWindow.once('ready-to-show', () => {
      bubbleWindow.show()
      mainWindow.hide()
    })
    bubbleWindow.on('closed', () => { bubbleWindow = null })
  } else {
    bubbleWindow.setPosition(pos.x, pos.y)
    bubbleWindow.show()
    mainWindow.hide()
  }
})

ipcMain.on('bubble-move', (_, x, y) => {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.setPosition(Math.round(x), Math.round(y))
  }
})

ipcMain.on('restore-from-bubble', () => {
  if (mainWindow) {
    if (bubbleWindow && !bubbleWindow.isDestroyed()) {
      const bubbleBounds = bubbleWindow.getBounds()
      const mainBounds = mainWindow.getBounds()
      const { screen } = require('electron')
      const display = screen.getDisplayNearestPoint({ x: bubbleBounds.x, y: bubbleBounds.y })
      const workArea = display.workArea

      let newX = Math.round(bubbleBounds.x + 18 - mainBounds.width / 2)
      let newY = bubbleBounds.y

      newX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - mainBounds.width))
      newY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - mainBounds.height))

      mainWindow.setPosition(newX, newY)
      bubbleWindow.hide()
    }
    mainWindow.show()
    mainWindow.focus()
  }
})

