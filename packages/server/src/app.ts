import cors from 'cors'
import express, { Express } from 'express'
import { AppController } from './controllers/AppController.js'
import path from 'path'
import os from 'os'

const app: Express = express()

// Initialize controller with a default user data path (e.g. ~/.rad-cms)
const userDataPath = process.env.RAD_CMS_USER_DATA || path.join(os.homedir(), '.rad-cms')
export const controller: AppController = new AppController(userDataPath)

app.use(cors())
app.use(express.json({ limit: '50mb' })) // Increase limit for images

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rad-cms-server' })
})

app.get('/api/config', (_req, res) => {
  res.json({
    root: controller.userDataPath
  })
})

// FS Routes
app.post('/api/fs/write', async (req, res) => {
  try {
    await controller.handleFsWrite(req.body.path, req.body.content)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/fs/writeImage', async (req, res) => {
  try {
    await controller.handleFsWriteImage(req.body.path, req.body.base64)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/fs/read', async (req, res) => {
  try {
    const content = await controller.handleFsRead(req.query.path as string)
    res.json({ content })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/fs/readdir', async (req, res) => {
  try {
    const files = await controller.handleFsReadDir(req.query.path as string)
    res.json(files)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/fs/mkdir', async (req, res) => {
  try {
    await controller.handleFsMkdir(req.body.path)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/fs/rename', async (req, res) => {
  try {
    await controller.handleFsRename(req.body.oldPath, req.body.newPath)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/fs/delete', async (req, res) => {
  try {
    await controller.handleFsDelete(req.body.path)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/fs/copy', async (req, res) => {
  try {
    await controller.handleFsCopy(req.body.sourcePath, req.body.destPath)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/fs/search', async (req, res) => {
  try {
    const results = await controller.handleFsSearch(req.query.path as string, req.query.query as string)
    res.json(results)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Git/Rad Routes
app.post('/api/git/publish', async (req, res) => {
  try {
    await controller.handleGitPublish(req.body.cwd)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/git/init', async (req, res) => {
  try {
    await controller.handleGitInit(req.body.cwd)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/git/fetch', async (req, res) => {
  try {
    await controller.handleGitFetch(req.body.cwd)
    res.json({ success: true })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/git/status', async (req, res) => {
  try {
    const status = await controller.handleGitGetStatus(req.query.cwd as string)
    res.json(status)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/rad/nodeStart', async (_req, res) => {
  try {
    const result = await controller.handleNodeStart()
    res.json({ result })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/rad/identity', async (_req, res) => {
  try {
    const identity = await controller.handleGetIdentity()
    res.json(identity)
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

export { app }
