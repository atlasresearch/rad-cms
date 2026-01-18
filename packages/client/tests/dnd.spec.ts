import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Sidebar Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
  })

  test('Can move file into a folder', async ({ page }) => {
    page.on('console', (msg) => console.log(`[Browser] ${msg.text()}`))
    // Open my-blog workspace which has folders
    await selectWorkspace(page, 'my-blog')

    // Wait for workspace to load
    await expect(page.locator('span.truncate', { hasText: 'post.md' })).toBeVisible()
    await expect(page.locator('span.truncate', { hasText: 'images' })).toBeVisible() // This is a dir

    // Drag post.md onto images
    // const source = page.locator('.sidebar-item >> text=post.md').first(); // Refined selector
    // Actually our sidebar items have text directly.
    // The structure is: div -> span(name).
    // We added draggable to the div.
    // Let's rely on text.

    await page
      .locator('span.truncate', { hasText: 'post.md' })
      .dragTo(page.locator('span.truncate', { hasText: 'images' }))

    // Verify move
    // post.md should be gone from root level.
    // images should be open.

    // Check that post.md is visible (it should be if folder opens)
    await expect(page.locator('span.truncate', { hasText: 'post.md' })).toBeVisible()

    // To verify it moved, strictly we should check the DOM nesting or re-listing.
    // But for visual test, if it didn't move it would still be visible.
    // If it moved and folder didn't open, it would satisfy "not visible".
    // If it moved and folder auto-opened, it satisfies "visible".
    // It's ambiguous.

    // Better check: The mock backend logs "rename".
    // We can't see backend logs easily here.

    // Let's assume visibility means success if we trust the "folder open" logic.
    // Let's check if the parent of post.md is the images folder container?
    // That's hard with playwright selectors.

    // How about we check that 'images' chevron is rotated?
    // We can check for the presence of the nested item which usually has higher padding.
    // Root depth=0 -> PL=8. Depth=1 -> PL=20.
    // Let's check style.
    // Scope to Sidebar to avoid matching editor title
    const sidebar = page.locator('.bg-\\[\\#F7F7F5\\]')
    const movedItem = sidebar.locator('span.truncate', { hasText: 'post.md' }).locator('..')
    await expect(movedItem).toHaveCSS('padding-left', '20px') // 1 * 12 + 8 = 20
  })
})
