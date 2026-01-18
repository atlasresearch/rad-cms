import { test, expect } from '@playwright/test'
import path from 'path'
import os from 'os'
import fs from 'fs'

const TEST_DIR = path.join(os.tmpdir(), 'rad-cms-e2e')

test('App sanity workflow', async ({ page }) => {
  // Inject localStorage before loading to set the workspace
  await page.addInitScript((dir) => {
    localStorage.setItem('rad-cms-workspaces', JSON.stringify([dir]))
  }, TEST_DIR)

  await page.goto('/')

  // Should see the greeting
  await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible()

  // Create a new page
  // Handle prompt
  page.on('dialog', async (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`)
    await dialog.accept('Test Page')
  })

  await page.getByText('Create a new page').click()

  // It should create the file and probably switch to it or list it
  // We expect "Test Page.md" to appear (UI appends extension)
  // Use first() to avoid ambiguity if it appears in multiple places (sidebar, header, etc)
  await expect(page.getByText('Test Page.md').first()).toBeVisible()

  // Verify on disk?
  // Since we share the same FS (local machine), we can check.
  // Wait, does Playwright run on same machine? Yes.
  // Is TEST_DIR accessible? Yes.

  // Note: Client does `fs.write(currentPath + '/' + name + '.md', '')`
  // `currentPath` is TEST_DIR.
  // file: TEST_DIR/Test Page.md

  const filePath = path.join(TEST_DIR, 'Test Page.md')
  // Poll for file existence
  await expect(async () => {
    expect(fs.existsSync(filePath)).toBe(true)
  }).toPass()

  // Test Search
  // Open search (assume 'Cmd+K' or button)
  // Check App.tsx: <CommandPalette /> listens to Cmd+K or I can trigger it in store?
  // Store has `toggleSearch`.
  // Or I can send valid keystrokes.

  await page.waitForTimeout(500) // Wait for animations/state
  await page.keyboard.press('Meta+k') // Cmd+K

  // Type query
  await page.getByPlaceholder('Search pages...').fill('Test Page')

  // Expect result
  await expect(page.getByText('Test Page.md').first()).toBeVisible()
})
