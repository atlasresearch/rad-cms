import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Sidebar Component', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    // Select the pre-seeded workspace to populate sidebar
    await selectWorkspace(page, 'test-workspace')
  })

  test('User Profile Display', async ({ page }) => {
    // Should show initial "T" for "Test User"
    // The user avatar is a small box with the initial
    const avatar = page.locator('.w-5.h-5.bg-\\[\\#E3E2E0\\]')
    await expect(avatar).toHaveText('T')

    // Should show workspace name in the specific sidebar header location
    // It is in the first flex-col container -> p-3 element
    const sidebarHeader = page.locator('.bg-\\[\\#F7F7F5\\].border-r')
    // Narrow down to the text inside the sidebar header
    // The header is the button with truncate
    await expect(sidebarHeader.locator('.truncate', { hasText: 'test-workspace' }).first()).toBeVisible()
  })

  test('Quick Actions Visibility', async ({ page }) => {
    // Check for Search, Home, Settings
    await expect(page.getByText('Search')).toBeVisible()
    await expect(page.getByText('Home')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()

    // Verify Icons are present (roughly checking svg existence in those containers)
    await expect(page.locator('text=Search').locator('..').locator('svg')).toBeVisible()
  })

  test('Pages List Interactions', async ({ page }) => {
    // Verify file list
    const docLink = page.locator('span.truncate', { hasText: 'document.md' })
    const notesLink = page.locator('span.truncate', { hasText: 'notes.txt' })

    await expect(docLink).toBeVisible()
    await expect(notesLink).toBeVisible()

    // Hover state check (difficult to strictly assert css hover styles across all browsers in playwright without screenshot,
    // but we can check class changes if we used JS events. Since it's CSS :hover, we assume functional correctness if elements are there).

    // Selection Styling
    await docLink.click()
    // The active item gets "bg-[#EFEFED] text-[#37352f]"
    // We can check if it has the active styling class
    const activeItem = page.locator('div.bg-\\[\\#EFEFED\\]').filter({ hasText: 'document.md' })
    await expect(activeItem).toBeVisible()
  })

  test('"Add a page" triggers creation dialog', async ({ page }) => {
    // Wired to New Page Modal
    await page.getByText('Add a page').click()

    // Expect the creation dialog input to appear
    const input = page.getByPlaceholder('Page Name')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Cancel button should hide it
    await page.getByText('Cancel').click()
    await expect(input).not.toBeVisible()
  })

  test('Delete file with custom confirmation', async ({ page }) => {
    // 1. Target file
    const fileItem = page.locator('span.truncate', { hasText: 'document.md' })
    await expect(fileItem).toBeVisible()

    // 2. Open Context Menu
    await fileItem.click({ button: 'right' })

    // 3. Click Delete
    await page.getByText('Delete').click()

    // 4. Verify Custom Modal
    await expect(page.getByText('Delete document.md?')).toBeVisible()

    // 5. Cancel first
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Delete document.md?')).not.toBeVisible()
    await expect(fileItem).toBeVisible()

    // 6. Delete for real
    await fileItem.click({ button: 'right' })
    await page.getByText('Delete').click()
    await page.getByRole('button', { name: 'Delete' }).click()

    // 7. Verify Gone
    await expect(fileItem).not.toBeVisible()
  })

  test('Context Menu stays in viewport', async ({ page }) => {
    // 1. Create files to fill space relative to a small viewport
    await page.evaluate(async () => {
      // Use internal bridge if exposed? Or just create enough files.
      // The mock setup exposes window.cms
      const fs = (window as any).cms.fs
      for (let i = 0; i < 10; i++) {
        await fs.write(`/Users/josh/RadCMS/test-workspace/viewport_file_${i}.txt`, 'content')
      }
    })

    // Reload to pick up files
    await page.reload()
    await selectWorkspace(page, 'test-workspace')

    // 2. Set small viewport
    await page.setViewportSize({ width: 1000, height: 500 })

    // 3. Find the last file
    const lastFile = page.getByText('viewport_file_9.txt')
    await expect(lastFile).toBeVisible()
    await lastFile.scrollIntoViewIfNeeded()

    // 4. Right click
    await lastFile.click({ button: 'right' })

    // 5. Check visibility
    const menu = page.locator('.context-menu')
    await expect(menu).toBeVisible()
    await expect(menu).toBeInViewport()

    // 6. Check positioning logic (optional, but good for TDD)
    const box = await menu.boundingBox()
    const viewport = page.viewportSize()

    if (box && viewport) {
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 5) // +5 buffer
    }
  })

  test('Move file via context menu', async ({ page }) => {
    // Create destination folder
    await page.evaluate(async () => {
      const fs = (window as any).cms.fs
      await fs.mkdir('/Users/josh/RadCMS/test-workspace/Journal')
    })
    await page.reload()
    await selectWorkspace(page, 'test-workspace')

    const fileItem = page.locator('span.truncate', { hasText: /^document\.md$/ })
    await expect(fileItem).toBeVisible()

    // Right click file
    await fileItem.click({ button: 'right' })

    // Click Move
    await page.getByText('Move').click()

    // Assert Modal
    await expect(page.getByText('Move File')).toBeVisible()

    // The input should be pre-filled with current parent dir
    const input = page.locator('input[type="text"]').last()
    await expect(input).toBeVisible()
    const value = await input.inputValue()
    expect(value).toContain('test-workspace')

    // Append /Journal
    await input.fill(value + '/Journal')

    // Click Move button
    const moveBtn = page.getByRole('button', { name: 'Move' })
    await expect(moveBtn).toBeVisible()
    await moveBtn.click()

    // Assert modal gone
    await expect(page.getByText('Move File')).not.toBeVisible()

    // Verify move
    // Note: workspaceStore auto-expands the folder if the active file is inside it.
    // So Journal should be open.
    // We initially wait for document.md to appear.
    try {
      await expect(page.locator('span.truncate', { hasText: /^document\.md$/ })).toBeVisible({ timeout: 2000 })
    } catch {
      // If not visible, maybe auto-expand failed or race condition? Try opening Journal manually ONLY if needed.
      const journal = page.locator('span.truncate', { hasText: /^Journal$/ })
      await journal.click()
      await expect(page.locator('span.truncate', { hasText: /^document\.md$/ })).toBeVisible()
    }
  })
})
