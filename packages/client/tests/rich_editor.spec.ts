import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Rich Text Editor', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
  })

  test('Renders Markdown as HTML blocks', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()

    // Tiptap uses .ProseMirror class
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()

    // Check for H1 tag corresponding to "# Main Document"
    await expect(editor.locator('h1')).toHaveText('Main Document')

    // Check for paragraph corresponding to "Content here."
    await expect(editor.locator('p')).toHaveText('Content here.')
  })

  // Validates that we are not just using a textarea anymore
  test('Is not a textarea', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()
    await expect(page.locator('textarea')).not.toBeVisible()
  })
})
