import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AppController } from './controllers/AppController.js'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import { spawnSync, execSync } from 'child_process'

// 1. Helpers for real binary interaction
function runGit(cwd: string, args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf-8' })
  if (result.status !== 0) throw new Error(`Git failed: ${result.stderr}`)
  return result.stdout.trim()
}

function runRad(cwd: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync('rad', args, { cwd, env, encoding: 'utf-8' })
  if (result.status !== 0) throw new Error(`Rad failed: ${result.stderr}`)
  return result.stdout.trim()
}

describe('AppController Integration (Real Binaries)', () => {
  let controller: AppController
  let userDataPath: string
  let radHome: string
  let repoPath: string

  // Increase timeout for real binary operations
  const TIMEOUT = 30_000

  // Fix PATH for test environment to be safe
  process.env.PATH = `/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/Users/josh/.radicle/bin:${process.env.PATH}`
  // Force absolute path for rad just in case
  process.env.RAD_BINARY_PATH = '/Users/josh/.radicle/bin/rad'

  beforeEach(async () => {
    // Use /tmp on Unix to avoid long paths for socket files (limit ~100 chars)
    const baseDir = process.platform === 'win32' ? os.tmpdir() : '/tmp'
    const tmpBase = await fs.mkdtemp(path.join(baseDir, 'rad-cms-real-'))
    userDataPath = path.join(tmpBase, 'data')
    repoPath = path.join(tmpBase, 'repo')
    radHome = path.join(userDataPath, 'radicle-env')

    // Expose passphrase for AppController to pick up
    process.env.RAD_PASSPHRASE = ''

    await fs.mkdir(userDataPath, { recursive: true })
    await fs.mkdir(repoPath, { recursive: true })

    // Initialize controller with this isolated path
    controller = new AppController(userDataPath)
  })

  afterEach(async () => {
    // Cleanup: Stop node if running
    try {
      // We need to use the specific RAD_HOME to stop the correct node
      const env = { ...process.env, RAD_HOME: radHome, RAD_PASSPHRASE: '' }
      execSync('rad node stop', { env, stdio: 'ignore' })
    } catch {
      // Ignore if not running
    }

    // Force cleanup of node process if it persists?
    // rad node stop usually handles it.

    // Remove temp dirs
    await fs.rm(path.dirname(userDataPath), { recursive: true, force: true }).catch(() => {})
  })

  it(
    'should auto-create identity if missing',
    async () => {
      // Verify no identity exists yet
      const entries = await fs.readdir(userDataPath).catch(() => [])
      expect(entries).not.toContain('radicle-env')

      // Action: Get Identity
      // This triggers "Radicle profile not found" -> auto auth
      const id = await controller.handleGetIdentity()

      // Verify
      expect(id).toContain('did:key:')

      // Check filesystem
      const keysDir = path.join(radHome, 'keys')
      const hasKeys = await fs
        .stat(keysDir)
        .then((s) => s.isDirectory())
        .catch(() => false)
      expect(hasKeys).toBe(true)
    },
    TIMEOUT
  )

  it(
    'should auto-start node when fetching',
    async () => {
      // 1. Setup Identity first (we need it to init a repo)
      await controller.handleGetIdentity()
      const env = { ...process.env, RAD_HOME: radHome, RAD_PASSPHRASE: '' }

      // 2. Setup a dummy repo
      runGit(repoPath, ['init'])
      runGit(repoPath, ['config', 'user.email', 'test@test.com'])
      runGit(repoPath, ['config', 'user.name', 'Test User'])
      await fs.writeFile(path.join(repoPath, 'README.md'), 'Test')
      runGit(repoPath, ['add', '.'])
      runGit(repoPath, ['commit', '-m', 'Initial commit'])

      // 3. Initialize Radicle Project
      runRad(repoPath, ['init', '--name', 'test-repo', '--description', 'test', '--private', '--no-confirm'], env)

      // 4. Ensure Node is STOPPED (new identity -> node not started by default)
      // Just to be sure:
      try {
        execSync('rad node stop', { env, stdio: 'ignore' })
      } catch {}

      // 5. Configure random port to avoid conflicts with real running nodes on localhost
      // Radicle config is at RAD_HOME/config.json
      const configPath = path.join(radHome, 'config.json')
      const randomPort = 8777 + Math.floor(Math.random() * 1000)

      // Read existing config created by auth
      const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'))

      // Update listener
      existingConfig.node = existingConfig.node || {}
      existingConfig.node.listen = [`0.0.0.0:${randomPort}`]

      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2))

      // 6. Action: Fetch
      // This should fail intially with "node must be running", then auto-start node.
      // Since we have no seeds, `rad sync` will fail with "no candidate seeds",
      // but getting that error confirms the node IS running and we talked to it.
      // If the node wasn't running, we'd get "node must be running".

      await expect(controller.handleGitFetch(repoPath)).rejects.toThrow(/no candidate seeds|nothing to sync/)

      // 7. Verify Node is running
      const status = runRad(repoPath, ['node', 'status'], env)
      expect(status).toContain('running')
    },
    TIMEOUT
  )
})
