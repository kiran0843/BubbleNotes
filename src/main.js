const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut } = require('electron')
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

function setBubbleAlwaysOnTop(win) {
  if (!win || win.isDestroyed()) return
  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(true, 'floating', 1)
  } else {
    win.setAlwaysOnTop(true, 'screen-saver', 1)
  }
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}

function toggleNotes() {
  if (mainWindow) {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
      showBubble()
    } else {
      if (bubbleWindow && !bubbleWindow.isDestroyed()) {
        bubbleWindow.hide()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  } else {
    createWindow()
  }
}

function toggleBubble() {
  if (bubbleWindow && !bubbleWindow.isDestroyed() && bubbleWindow.isVisible()) {
    // Restore notes from bubble
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
    mainWindow.show()
    mainWindow.focus()
  } else {
    if (mainWindow) mainWindow.hide()
    showBubble()
  }
}

function registerGlobalShortcuts() {
  // Quick Action Shortcuts:
  // Alt+Shift+N or Ctrl+Alt+N: Toggle Notes window
  // Alt+Shift+B or Ctrl+Alt+B: Toggle Floating Bubble
  try {
    globalShortcut.register('Alt+Shift+N', toggleNotes)
    globalShortcut.register('CommandOrControl+Alt+N', toggleNotes)
    globalShortcut.register('Alt+Shift+B', toggleBubble)
    globalShortcut.register('CommandOrControl+Alt+B', toggleBubble)
  } catch (err) {
    console.error('Failed to register global shortcuts:', err)
  }
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
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
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
  const iconPath = path.join(__dirname, '..', 'assets', 'bubble-avatar.png')
  let icon
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } else {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Notes (Alt+Shift+N)',
      click: () => {
        if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.hide()
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Show Floating Bubble (Alt+Shift+B)',
      click: () => {
        if (mainWindow) mainWindow.hide()
        showBubble()
      }
    },
    { type: 'separator' },
    { label: 'Quit BubbleNotes', click: () => app.quit() }
  ])
  tray.setToolTip('BubbleNotes (Alt+Shift+N)')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide()
      showBubble()
    } else {
      if (bubbleWindow && !bubbleWindow.isDestroyed()) bubbleWindow.hide()
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show()
  }
  createWindow()
  createTray()
  registerGlobalShortcuts()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
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
  const { screen } = require('electron')
  if (!mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay()
    return { x: primaryDisplay.workArea.x + 20, y: primaryDisplay.workArea.y + 20 }
  }
  const bounds = mainWindow.getBounds()
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y })
  const workArea = display.workArea

  let x = Math.round(bounds.x + bounds.width / 2 - 18)
  let y = bounds.y

  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - 36))
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - 36))

  return { x, y }
}

function showBubble() {
  const pos = getBubblePosition()

  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    bubbleWindow = new BrowserWindow({
      width: 36,
      height: 36,
      useContentSize: true,
      x: pos.x,
      y: pos.y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      resizable: false,
      minimizable: false,
      thickFrame: false,
      skipTaskbar: true,
      hasShadow: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'bubble-preload.js'),
        backgroundThrottling: false
      }
    })

    setBubbleAlwaysOnTop(bubbleWindow)
    bubbleWindow.loadFile(path.join(__dirname, 'bubble.html'))

    bubbleWindow.once('ready-to-show', () => {
      setBubbleAlwaysOnTop(bubbleWindow)
      bubbleWindow.show()
    })

    bubbleWindow.on('minimize', (e) => {
      e.preventDefault()
      bubbleWindow.restore()
      setBubbleAlwaysOnTop(bubbleWindow)
    })

    bubbleWindow.on('blur', () => {
      setBubbleAlwaysOnTop(bubbleWindow)
    })

    bubbleWindow.on('closed', () => {
      bubbleWindow = null
    })
  } else {
    bubbleWindow.setPosition(pos.x, pos.y)
    setBubbleAlwaysOnTop(bubbleWindow)
    bubbleWindow.show()
  }
}

ipcMain.on('minimize-to-bubble', () => {
  if (!mainWindow) return
  mainWindow.hide()
  showBubble()
})

ipcMain.on('bubble-move', (_, x, y) => {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    const { screen } = require('electron')
    const display = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) })
    const workArea = display.workArea
    const clampedX = Math.max(workArea.x, Math.min(Math.round(x), workArea.x + workArea.width - 36))
    const clampedY = Math.max(workArea.y, Math.min(Math.round(y), workArea.y + workArea.height - 36))
    bubbleWindow.setPosition(clampedX, clampedY)
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

