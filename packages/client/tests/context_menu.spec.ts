import { test, expect } from '@playwright/test'
import { setupMockCms } from './utils/mock'

test.describe('Sidebar Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    // Default loads "test-workspace" which has "document.md"
    await expect(page.locator('span.truncate', { hasText: 'document.md' })).toBeVisible()
  })

  test('Can delete a file via context menu', async ({ page }) => {
    // Setup dialog handler
    page.on('dialog', (dialog) => dialog.accept())

    // Right click document.md
    await page.locator('span.truncate', { hasText: 'document.md' }).click({ button: 'right' })

    // Expect menu
    const menu = page.locator('.context-menu') // We need to implement this class
    await expect(menu).toBeVisible()
    await expect(menu.getByText('Delete')).toBeVisible()

    // Click Delete
    await menu.getByText('Delete').click()

    // Handle Custom Delete Modal
    // The modal title is a div with text "Delete File"
    await expect(page.getByText('Delete File')).toBeVisible()
    await expect(page.getByText('Delete document.md?')).toBeVisible()

    // Click confirm
    await page.locator('button', { hasText: 'Delete' }).last().click()

    // Expect file to handle confirmation (if any) or just disappear
    // For MVP spec, let's assume direct delete or simple confirm.
    // Let's assume direct for now.
    await expect(page.locator('span.truncate', { hasText: 'document.md' })).toBeHidden()

    // Verify FS (via bridge logs if we could, or just by reloading?)
    // Reload page to verify persistence
    await page.reload()
    await expect(page.locator('span.truncate', { hasText: 'document.md' })).toBeHidden()
  })

  test('Can duplicate a file via context menu', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click({ button: 'right' })
    await page.locator('.context-menu').getByText('Duplicate').click()

    // Expect new file e.g. "document copy.md" or "document_copy.md"
    await expect(page.locator('span.truncate', { hasText: 'document copy.md' })).toBeVisible()
  })

  test('Can rename a file via context menu', async ({ page }) => {
    // This likely triggers the same rename UI or a prompt
    await page.locator('span.truncate', { hasText: 'document.md' }).click({ button: 'right' })
    await page.locator('.context-menu').getByText('Rename').click()

    // Expect some input to appear.
    // Maybe a modal or the sidebar item becomes editable?
    // Let's assume a browser prompt for MVP or a custom modal.
    // Actually browser prompt is hard to test in Playwright without event handling.
    // Let's assume a Custom Modal or Sidebar Input.
    // Given we have a "Settings Modal" todo, maybe we use a simple prompt for now?
    // Let's check how we want to implement it.
    // Use a "Rename Modal" div.

    const renameModal = page.locator('.rename-modal')
    await expect(renameModal).toBeVisible()

    await renameModal.getByRole('textbox').fill('renamed-doc.md')
    await renameModal.getByRole('button', { name: 'Confirm' }).click()

    await expect(page.locator('span.truncate', { hasText: 'renamed-doc.md' })).toBeVisible()
    await expect(page.locator('span.truncate', { hasText: 'document.md' })).toBeHidden()
  })
})
