import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Global Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
  })

  test('Opens with keyboard shortcut', async ({ page }) => {
    // MacOS uses Meta, Windows/Linux Control. Playwright usually handles "ControlOrMeta" but "Meta+k" is specific.
    // Let's assume Mac environment or use modifier.
    await page.keyboard.press('Meta+k')
    await expect(page.getByPlaceholder('Search pages...')).toBeVisible()
  })

  test('Opens from sidebar click', async ({ page }) => {
    await page.getByText('Search').click()
    await expect(page.getByPlaceholder('Search pages...')).toBeVisible()
  })

  test('Filters and navigates', async ({ page }) => {
    // Open search
    await page.getByText('Search').click()

    // Type "notes"
    const input = page.getByPlaceholder('Search pages...')
    await input.fill('notes')

    // Results should filter
    await expect(page.getByRole('listbox').getByText('notes.txt').first()).toBeVisible()
    await expect(page.getByRole('listbox').getByText('document.md').first()).not.toBeVisible()

    // Verify Keyboard Navigation (Red phase)
    // 1. Arrow Down to select
    await page.keyboard.press('ArrowDown')
    // Check if selected (bg-gray-100 is typically used for selection in this codebase)
    // finding the row container
    const resultRow = page.getByRole('listbox').locator('div.cursor-pointer').filter({ hasText: 'notes.txt' })
    await expect(resultRow).toHaveClass(/bg-gray-100/)

    // 2. Enter to open
    await page.keyboard.press('Enter')

    // Modal closes and file opens
    await expect(input).not.toBeVisible()
    await expect(page.locator('.ProseMirror p')).toHaveText('Some quick notes.')
  })

  test('Search matches file content (mocked)', async ({ page }) => {
    // Open search
    await page.getByText('Search').click()

    // Type "Main Document" (matches content of document.md, but not filename)
    const input = page.getByPlaceholder('Search pages...')
    await input.fill('Main Document')

    // If content search works, document.md should appear.
    // Use .first() because it might match title and path
    await expect(page.getByRole('listbox').getByText('document.md').first()).toBeVisible()
  })
})
