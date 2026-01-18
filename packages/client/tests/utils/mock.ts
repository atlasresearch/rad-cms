import { Page } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execAsync = util.promisify(exec)

// Use the same environment variable as the server (loaded via globalSetup or .env)
const TEST_ENV_ROOT = process.env.RAD_CMS_USER_DATA || '/tmp/rad-cms-test-data'
const TEST_WS_ROOT = path.join(TEST_ENV_ROOT, 'RadCMS')

export const selectWorkspace = async (page: Page, workspaceName: string) => {
  // Open the switcher
  await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()
  // Click the workspace in the dropdown (scoped to the floating menu)
  await page.locator('.absolute.z-50').getByText(workspaceName).click()
}

export const setupMockCms = async (page: Page) => {
  // 1. Reset Test Environment (Filesystem)
  try {
    // Warning: This rm -rf is dangerous if env var is wrong, but it's hardcoded to /tmp/rad-cms-test-data here.
    await fs.rm(TEST_ENV_ROOT, { recursive: true, force: true })
    await fs.mkdir(TEST_WS_ROOT, { recursive: true })

    const ws1 = path.join(TEST_WS_ROOT, 'test-workspace')
    await fs.mkdir(ws1, { recursive: true })
    await fs.writeFile(path.join(ws1, 'document.md'), '# Main Document\nContent here.')
    await fs.writeFile(path.join(ws1, 'notes.txt'), 'Some quick notes.')

    const ws2 = path.join(TEST_WS_ROOT, 'my-blog')
    await fs.mkdir(ws2, { recursive: true })
    await fs.writeFile(path.join(ws2, 'post.md'), '# Hello World')
    const imgDir = path.join(ws2, 'images')
    await fs.mkdir(imgDir, { recursive: true })

    // Git Setup
    const gitConfig = async (cwd: string) => {
      await execAsync('git init', { cwd })
      // We configured the git user in .env.test presumably?
      // No, git config is local to the repo usually or global.
      await execAsync('git config user.email "test@example.com"', { cwd })
      await execAsync('git config user.name "Test User"', { cwd })
      await execAsync('git add .', { cwd })
      await execAsync('git commit -m "Initial"', { cwd })
    }

    await gitConfig(ws1)
    await gitConfig(ws2)
  } catch (e) {
    console.error('Failed to seed test environment:', e)
    throw e
  }

  // 2. Configure Browser State
  // We inject the paths that point to our isolated test environment.
  await page.addInitScript(
    (workspaces) => {
      localStorage.setItem('rad-cms-workspaces', JSON.stringify(workspaces))
      // Note: app's platform.ts will detect missing window.cms and initialize HTTP bridge.
    },
    [path.join(TEST_WS_ROOT, 'test-workspace'), path.join(TEST_WS_ROOT, 'my-blog')]
  )
}
