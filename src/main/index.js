'use strict'

import {app, BrowserWindow, Menu, ipcMain, session} from 'electron'

import Store from 'electron-store'
const electronStore = new Store()

if (typeof electronStore.get('scrapboxToken') === 'undefined') {
  electronStore.set('scrapboxHost', 'http://localhost:8880')
  electronStore.set('scrapboxToken', '')
}

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 800,
    minWidth: 400,
    height: 600,
    minHeight: 300,
    useContentSize: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      webSecurity: false
    }
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu () {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
        { type: 'separator' },
        {
          label: 'Increase Indent',
          accelerator: 'CmdOrCtrl+]',
          click: function (item, focusedWindow) {
            focusedWindow.webContents.sendInputEvent({ type: 'keyDown', modifiers: ['control'], keyCode: 'right' })
          }
        },
        {
          label: 'Decrease Indent',
          accelerator: 'CmdOrCtrl+[',
          click: function (item, focusedWindow) {
            focusedWindow.webContents.sendInputEvent({type: 'keyDown', modifiers: ['control'], keyCode: 'left'})
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Cross-Search',
          accelerator: 'CmdOrCtrl+p',
          click: function (item, focusedWindow) {
            focusedWindow.webContents.send('CmdOrCtrl+p')
          }
        },
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: function (item, focusedWindow) {
            if (focusedWindow) {
              focusedWindow.webContents.send('CmdOrCtrl+,')
            }
          }
        },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function updateSession (host, token) {
  const cookie = { url: host, name: 'connect.sid', value: token }
  session.defaultSession.cookies.set(cookie, (error) => {
    if (error) console.error(error)
  })
}

app.on('ready', () => {
  updateSession(electronStore.get('scrapboxHost'), electronStore.get('scrapboxToken'))
  createWindow()
  createMenu()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.on('updateScrapboxToken', (event, msg) => {
  updateSession(msg.host, msg.token)
  mainWindow.reload()
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
