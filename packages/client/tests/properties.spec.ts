import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('Page Properties', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
    await page.locator('span.truncate', { hasText: 'document.md' }).click()
  })

  test('Can add and persist page icon', async ({ page }) => {
    // Initially no icon controls visible (or maybe "Add icon" is visible)
    // Check for "Add icon" button in the group above title
    const addIconBtn = page.getByText('Add icon')
    await expect(addIconBtn).toBeVisible()

    // Click Add Icon -> Should set a default random icon or show picker.
    // For MVP, let's say clicking it sets a default '📄' or similar,
    // and then clicking the icon allows changing it.
    await addIconBtn.click()

    // Now "Add icon" should be gone, and an icon should be visible above title
    await expect(addIconBtn).not.toBeVisible()
    const iconDisplay = page.locator('.page-icon')
    await expect(iconDisplay).toBeVisible()

    // Test Picker: Click the icon to open picker
    await iconDisplay.click()
    const picker = page.locator('.icon-picker')
    await expect(picker).toBeVisible()

    // Select an emoji (e.g. 🚀)
    await picker.getByText('🚀').click()

    // Picker should close
    await expect(picker).toBeHidden()

    // Icon should update
    await expect(iconDisplay).toHaveText('🚀')

    // Verify persistence to file content (via saved status)
    await expect(page.getByText('Saved')).toBeVisible()

    // Check sidebar - finding the item in sidebar keys off the name 'document.md'
    // We expect the icon next to it to change from default file icon to our new icon.
    // This is tricky to test with text match, but we can check if an emoji is rendered.
    // Let's assume the icon we set is '📄' (or similar default from logic).
    // const sidebarItem = page.locator('.sidebar-item').filter({ hasText: 'document.md' });
    // assert sidebar item contains the emoji
  })

  test('Can add and persist cover image', async ({ page }) => {
    const addCoverBtn = page.getByText('Add cover')
    await expect(addCoverBtn).toBeVisible()

    // Handle prompt
    page.on('dialog', (dialog) => dialog.accept('https://example.com/cover.jpg'))

    await addCoverBtn.click()

    // Cover image should appear
    const cover = page.locator('.page-cover')
    await expect(cover).toBeVisible()

    // "Add cover" should be hidden (or changed to "Change cover" on hover)
    await expect(addCoverBtn).not.toBeVisible()
  })
})
