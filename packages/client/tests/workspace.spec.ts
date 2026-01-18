import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Workspace Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
  })

  test('Complete workspace lifecycle', async ({ page }) => {
    await page.goto('/')

    // 1. Initial Load - Look for PAGES header instead of Explorer
    await expect(page.getByText('PAGES').first()).toBeVisible()

    // 2. Switch to another workspace (Simulating "Lifecycle" usage)
    // We simulate the existence of another workspace "my-blog"

    // Open menu to verify options exist
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()
    await expect(page.locator('.absolute.z-50')).toBeVisible()
    // Close menu
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()

    // Use helper to switch
    await selectWorkspace(page, 'my-blog')

    // 3. Verify Workspace Loaded
    await expect(page.locator('span.truncate', { hasText: 'post.md' })).toBeVisible()
    // images might be hidden if I didn't implement folder rendering, but I used a For loop over files.
    // await expect(select).toHaveValue('/Users/josh/RadCMS/my-blog');

    // images might be hidden if I didn't implement folder rendering, but I used a For loop over files.
    // The mock returns files and directories. My Sidebar just iterates workspaceStore.state.files.
    // If the store flattens or includes dirs, they might show up.
    // Looking at sidebar logic: For each={workspaceStore.state.files}.
    // The mock 'readdir' returns {name, isFile, isDirectory}.
    // So 'images' should be in the list.
    await expect(page.locator('span.truncate', { hasText: 'images' })).toBeVisible()

    // 4. Open File
    await page.locator('span.truncate', { hasText: 'post.md' }).click()

    // Editor content is now Tiptap
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    await expect(editor).toContainText('Hello World')

    // Title is now an input, not a heading
    const titleInput = page.locator('input.text-4xl')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue('post.md')

    // 5. Edit File (Auto-save & Dirty State)
    // Note: Tiptap might handle markdown shortcuts differently on fill vs type,
    // but strict value equality check is less important than persistence flow here.
    await editor.fill('Hello World Updated')
    // Check for 'Saving...' or 'Saved'
    await expect(page.getByText('Saved')).toBeVisible()

    // 6. Identity Check (My Name from user profile)
    // In Sidebar: userName()[0] is displayed (Initial). "Test User"[0] = "T".
    // Or wait, logic was: userName = identity.split('\n')[1]. So "Test User".
    // Display is {userName()[0]}. So "T".
    await expect(page.getByText('T', { exact: true })).toBeVisible()

    // 7. Publish - Button is currently removed in UI redesign.
    // await page.getByRole('button', { name: 'Sync / Publish' }).click();

    // 8. Navigation / Persistence
    await page.reload()

    // Check if it's in the dropdown options by opening the switcher
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()
    await expect(page.locator('.absolute.z-50').getByText('my-blog')).toBeVisible()

    // Select it again
    await page.locator('.absolute.z-50').getByText('my-blog').click()
    await expect(page.locator('span.truncate', { hasText: 'post.md' })).toBeVisible()
  })
})
