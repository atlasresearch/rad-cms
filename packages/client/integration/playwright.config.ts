import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

const TEST_DIR = path.join(os.tmpdir(), 'rad-cms-e2e')

// Clean and ensure test directory exists
if (fs.existsSync(TEST_DIR)) {
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true })
  } catch (e) {
    console.error('Failed to clean test dir', e)
    // If locked, maybe use a suffix
  }
}
fs.mkdirSync(TEST_DIR, { recursive: true })

console.log(`Running E2E tests with data in: ${TEST_DIR}`)

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://localhost:3000',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'cd ../../.. && pnpm dev',
    url: 'https://localhost:3000',
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    env: {
      RAD_CMS_USER_DATA: TEST_DIR
    },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120 * 1000
  }
})
