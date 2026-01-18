import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { AppController } from '@rad-cms/server'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ignore self-signed certificates in dev
app.commandLine.appendSwitch('ignore-certificate-errors')

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  // Check if we are in dev mode or prod
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    await mainWindow.loadURL('https://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // In prod, normally we load a file. Implementation dependent on build.
    // mainWindow.loadFile(path.join(__dirname, '../../client/dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const controller = new AppController(app.getPath('userData'))

  // IPC Handlers
  ipcMain.handle('node:start', () => controller.handleNodeStart())
  ipcMain.handle('fs:write', (_, filePath, content) => controller.handleFsWrite(filePath, content))
  ipcMain.handle('fs:read', (_, filePath) => controller.handleFsRead(filePath))
  ipcMain.handle('fs:readdir', (_, dirPath) => controller.handleFsReadDir(dirPath))
  ipcMain.handle('fs:mkdir', (_, dirPath) => controller.handleFsMkdir(dirPath))
  ipcMain.handle('fs:rename', (_, oldPath, newPath) => controller.handleFsRename(oldPath, newPath))
  ipcMain.handle('fs:delete', (_, filePath) => controller.handleFsDelete(filePath))
  ipcMain.handle('fs:search', (_, dirPath, query) => controller.handleFsSearch(dirPath, query))
  ipcMain.handle('fs:writeImage', (_, filePath, base64) => controller.handleFsWriteImage(filePath, base64))
  ipcMain.handle('fs:copy', (_, sourcePath, destPath) => controller.handleFsCopy(sourcePath, destPath))
  ipcMain.handle('git:publish', (_, cwd) => controller.handleGitPublish(cwd))
  ipcMain.handle('git:fetch', (_, cwd) => controller.handleGitFetch(cwd))
  ipcMain.handle('git:get-status', (_, cwd) => controller.handleGitGetStatus(cwd))
  ipcMain.handle('rad:get-identity', () => controller.handleGetIdentity())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
