import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Publishing Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
    await page.locator('span.truncate', { hasText: 'document.md' }).click()
  })

  test('Can publish changes', async ({ page }) => {
    // Edit file to make it dirty/unpublished
    const editor = page.locator('.ProseMirror')
    await editor.fill('Change for publish')

    // Wait for auto-save (Saved pill)
    await expect(page.getByText('Saved')).toBeVisible()

    // Check for "Unpublished Changes"
    await expect(page.getByText('Unpublished Changes')).toBeVisible()

    // Click Publish button (needs to be added)
    // We'll assume a button with "Share" or "Publish" label or icon.
    // Notion has "Share" -> "Publish". RadCMS might just have a top-level button.
    // Let's add a "Cloud" or "Upload" icon button to the header.
    const publishBtn = page.getByLabel('Publish changes')
    await publishBtn.click()

    // Expect status to change to Published
    await expect(page.getByText('Published', { exact: true })).toBeVisible()
  })
})
