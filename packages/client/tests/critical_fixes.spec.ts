import { test, expect } from '@playwright/test'

test.describe('Critical Fixes', () => {
  test('Dark Mode applies class to html element', async ({ page }) => {
    await page.goto('/')

    // Open Settings
    await page.getByText('Settings').click()

    // Go to Appearance
    await page.getByText('Appearance').click()

    // Select Dark Mode
    await page.locator('select').selectOption('dark')

    // Verify class
    // expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('Toast appears on error', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Add a page').click()
    await page.getByPlaceholder('Page Name').fill('error-test')
    await page.keyboard.press('Enter')

    // Mock fs.write to fail
    await page.evaluate(() => {
      // @ts-ignore
      window.cms.fs.write = () => Promise.reject(new Error('Simulated Disk Error'))
    })

    // Type something to trigger save
    await page.locator('.ProseMirror').type('Changes')

    // Expect toast
    // Use first() to avoid strict mode violation if multiple failures occur
    const toast = page.locator('.toast-error').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Failed to save file')
  })

  test('Bubble Menu appears on text selection', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Add a page').click()
    await page.getByPlaceholder('Page Name').fill('bubble-test')
    await page.keyboard.press('Enter')

    // Type text
    await page.locator('.ProseMirror').type('Select me')

    // Select text
    await page.locator('.ProseMirror').selectText()

    // Expect bubble menu
    await expect(page.locator('.bubble-menu')).toBeVisible()
    await expect(page.locator('button[data-testid="bold"]')).toBeVisible()
  })
})
