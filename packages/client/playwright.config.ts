import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load test environment variables from server's .env.test configuration
// This ensures the test runner and the server instance share the same configuration
dotenv.config({ path: path.resolve(__dirname, '../server/.env.test') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
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
  webServer: [
    {
      command: 'cd ../server && NODE_ENV=test PORT=3002 HOST=127.0.0.1 npm run dev',
      url: 'http://127.0.0.1:3002/health',
      reuseExistingServer: false
    },
    {
      command: 'VITE_API_URL=http://127.0.0.1:3002 npm run dev',
      url: 'https://localhost:3000',
      reuseExistingServer: false,
      ignoreHTTPSErrors: true,
      env: {
        VITE_API_URL: 'http://localhost:3002'
      }
    }
  ]
})
