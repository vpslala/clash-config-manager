import path from 'path'
import {app, BrowserWindow, Menu} from 'electron'
import {is} from 'electron-util'
import _ from 'lodash'
// import {autoUpdater} from 'electron-updater'

import './init/meta'
import {load as loadDevExt} from './dev/ext'
import {loadWindowState, saveWindowState} from './initWindowState'
import menu from './menu'
import './ipc/index'

// Prevent window from being garbage collected
let mainWindow
main()

async function main() {
  initAppEvents()
  await app.whenReady()

  Menu.setApplicationMenu(menu)
  loadDevExt()
  mainWindow = await createMainWindow()

  if (process.env.NODE_ENV === 'production') {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else {
    await mainWindow.loadURL('http://localhost:7749')
  }
}

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

const createMainWindow = async () => {
  const {bounds} = await loadWindowState()

  const win = new BrowserWindow({
    title: app.name,
    show: false,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  const preventClose = (e) => {
    e.preventDefault()
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => win.hide())
      win.setFullScreen(false) // 直接 hide 全屏窗口会导致黑屏
    } else {
      win.hide()
    }
  }
  win.on('close', preventClose)
  app.on('before-quit', () => {
    win.off('close', preventClose)
  })

  const saveWindowStateHandler = _.throttle(() => {
    const bounds = mainWindow?.getBounds()
    if (!bounds) return
    saveWindowState({bounds})
  }, 1000)
  win.on('resize', () => {
    saveWindowStateHandler()
  })
  win.on('move', () => {
    saveWindowStateHandler()
  })

  return win
}

function initAppEvents() {
  // Prevent multiple instances of the app
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
    }
  })

  app.on('window-all-closed', () => {
    if (!is.macos) {
      app.quit()
    }
  })

  app.on('activate', async () => {
    mainWindow.show()
  })

  app.on('before-quit', async () => {
    if (mainWindow) {
      await saveWindowState({
        bounds: mainWindow?.getBounds(),
      })
    }
  })
}