import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Editor Component', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    // Select workspace and open a file
    await selectWorkspace(page, 'test-workspace')
  })

  test('Empty State', async ({ page }) => {
    // No file selected yet -> Should show Home View
    await expect(page.getByText(/Good (morning|afternoon|evening), Test User/)).toBeVisible()
    // Arrow icon check removed as it was specific to the old empty editor state
    // await expect(page.locator('svg[width="64"]')).toBeVisible();
  })

  test('Document Layout & Header', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()

    // Breadcrumbs - contained in sticky top-0
    const topBar = page.locator('.sticky.top-0')
    await expect(topBar.getByText('test-workspace')).toBeVisible()
    await expect(topBar.getByText('/').nth(0)).toBeVisible() // Separator
    await expect(topBar.getByText('document.md')).toBeVisible()

    // Status Pills
    await expect(page.getByText('Saved')).toBeVisible()

    // Top Bar Icons check
    // We expect 3 icons on the right specific to editor: Clock, Star, MoreHorizontal
    await expect(topBar.getByLabel('View history')).toBeVisible()
    await expect(topBar.getByLabel('Star page')).toBeVisible()
    await expect(topBar.getByLabel('More options')).toBeVisible()
  })

  test('Editor Controls (Hover States)', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()

    // The controls are in a group that requires hover
    // "Add icon", "Add cover", "Add comment"
    // Force hover
    const headerGroup = page.locator('.group.mb-8')
    await headerGroup.hover()

    // Expect opacity to change or at least be perceivable (Playwright checks visibility based on computed styles)
    // But opacity transition might take time.
    // Let's just check they exist in the DOM first.
    await expect(page.getByText('Add icon')).toBeAttached()
    await expect(page.getByText('Add cover')).toBeAttached()

    // After hover, strict visibility check
    await expect(page.getByText('Add icon')).toBeVisible()
  })

  test('Editing Content', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible()
    await expect(editor).toContainText('Main Document')

    // Type into it
    await editor.fill('New content')

    // Check dirty state update
    // "Saved" should become "Saving..." (if async) or we might miss it if fast.
    // In mock, write is instant.
    // But let's check the store/UI update.
    await expect(editor).toHaveText('New content')
  })

  test('Title Input', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'document.md' }).click()

    const titleInput = page.locator('input.text-4xl')
    await expect(titleInput).toHaveValue('document.md')

    // Field should be enabled for renaming
    await expect(titleInput).toBeEnabled()
  })
})
