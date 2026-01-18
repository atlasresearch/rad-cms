import { createRadicleService, RadicleService } from '../services/RadicleGit.js'
import { createRadicleEnv } from '../config/env.js'
import * as fs from 'fs/promises'
import * as path from 'path'

export class AppController {
  private radGit: RadicleService
  private radHome: string
  public userDataPath: string

  constructor(userDataPath: string) {
    this.userDataPath = userDataPath
    const env = createRadicleEnv(userDataPath)
    this.radHome = env.RAD_HOME
    this.radGit = createRadicleService(this.radHome, {
      rad: process.env.RAD_BINARY_PATH,
      git: process.env.GIT_BINARY_PATH
    })
  }

  async handleNodeStart() {
    return this.radGit.exec('rad', ['node', 'start'], this.radHome)
  }

  async handleFsWrite(filePath: string, content: string) {
    const dirname = path.dirname(filePath)
    await fs.mkdir(dirname, { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  }

  async handleFsWriteImage(filePath: string, base64Content: string) {
    const dirname = path.dirname(filePath)
    await fs.mkdir(dirname, { recursive: true })
    const base64Data = base64Content.replace(/^data:image\/\w+;base64,/, '')
    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'))
  }

  async handleFsMkdir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true })
  }

  async handleFsRead(filePath: string) {
    return fs.readFile(filePath, 'utf-8')
  }

  async handleFsReadDir(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(dirPath, entry.name)
    }))
  }

  async handleFsRename(oldPath: string, newPath: string) {
    await fs.rename(oldPath, newPath)
  }

  async handleFsDelete(filePath: string) {
    await fs.rm(filePath, { recursive: true, force: true })
  }

  async handleFsCopy(sourcePath: string, destPath: string) {
    await fs.cp(sourcePath, destPath, { recursive: true })
  }

  async handleFsSearch(
    dirPath: string,
    query: string
  ): Promise<{ name: string; isDirectory: boolean; isFile: boolean; path: string }[]> {
    const results: { name: string; isDirectory: boolean; isFile: boolean; path: string }[] = []

    async function walk(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          if (entry.name !== '.git' && entry.name !== 'node_modules') {
            await walk(entryPath)
          }
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(entryPath, 'utf-8')
            if (content.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                name: entry.name,
                isDirectory: false,
                isFile: true,
                path: entryPath
              })
            }
          } catch {
            // Ignore read errors (e.g. binary files)
          }
        }
      }
    }

    await walk(dirPath)
    return results
  }

  async handleGitInit(cwd: string) {
    try {
      await this.radGit.exec('git', ['init'], cwd)
      await this.radGit.init(cwd)
    } catch (e: any) {
      console.error('Failed to initialize repo:', e)
      // We generally don't want to crash if it's already a repo, but init should handle it.
      // If git init works but rad init fails (e.g. already initialized), that's fine.
    }
  }

  async handleGitPublish(cwd: string) {
    try {
      await this.radGit.publish(cwd, 'Updated via Sovereign UI')
    } catch (error: any) {
      if (error.message && error.message.includes('node must be running')) {
        console.log('Radicle node not running, starting it...')
        await this.radGit.nodeStart(this.radHome)
        await this.radGit.publish(cwd, 'Updated via Sovereign UI')
        return
      }
      throw error
    }
  }

  async handleGitFetch(cwd: string) {
    try {
      await this.radGit.fetch(cwd)
    } catch (error: any) {
      if (error.message && error.message.includes('node must be running')) {
        console.log('Radicle node not running, starting it...')
        await this.radGit.nodeStart(this.radHome)
        await this.radGit.fetch(cwd)
        return
      }
      throw error
    }
  }

  async handleGitGetStatus(cwd: string) {
    return this.radGit.status(cwd)
  }

  async handleGetIdentity() {
    try {
      // Ensure RAD_HOME exists so we can use it as CWD, preventing spawning errors
      await fs.mkdir(this.radHome, { recursive: true })
      return await this.radGit.exec('rad', ['self'], this.radHome)
    } catch (error: any) {
      if (error.message && (error.message.includes('Radicle profile not found') || error.message.includes('ENOENT'))) {
        console.log('Radicle profile not found or not initialized, creating new identity...')
        // Ensure directory exists (redundant if caught above, but safe)
        await fs.mkdir(this.radHome, { recursive: true })

        // Auto-create identity
        await this.radGit.auth(this.radHome, 'rad-cms-user')
        return await this.radGit.exec('rad', ['self'], this.radHome)
      }
      throw error
    }
  }
}
