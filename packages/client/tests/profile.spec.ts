import { test, expect } from '@playwright/test'
import { setupMockCms } from './utils/mock'

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
  })

  // We assume default workspace is "RadCMS" from mock
  // and identity is "Alice (Dev)"

  test('Shows profile menu content', async ({ page }) => {
    // Open menu by clicking the workspace switcher at top left
    // Selector strategy: the container with the ChevronDown
    // We might need a better selector in the future but let's try text/icon
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()

    // Check identity
    await expect(page.locator('.absolute.z-50').getByText('Test User')).toBeVisible()
    await expect(page.locator('.absolute.z-50').getByText('did:key:test')).toBeVisible()

    // Check actions
    await expect(page.getByText('Log out')).toBeVisible()
    await expect(page.getByText('Create Workspace')).toBeVisible()
  })

  test('Can logout', async ({ page }) => {
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()
    await page.getByText('Log out').click()

    // After logout, identity should be "Anonymous" or "No Identity" in the state,
    // but the menu closes.
    // We can verify if the user Avatar changes or if we open menu again logic changes.
    // In Sidebar.tsx: userName()[0] fallback is "A" for Anonymous?
    // const userName = () => workspaceStore.state.identity?.split('\n')[1] || "Anonymous";

    await expect(page.locator('.text-xs.flex.items-center.justify-center').first()).toHaveText('A')
  })

  test('Can toggle create workspace modal', async ({ page }) => {
    await page.locator('.flex.items-center.gap-2.m-2.rounded').first().click()
    await page.getByText('Create Workspace').click()

    await expect(page.getByText('New Workspace')).toBeVisible() // Modal title
    await expect(page.getByPlaceholder('Workspace Name')).toBeVisible()

    // Close it
    await page.getByText('Cancel').click()
    await expect(page.getByPlaceholder('Workspace Name')).toBeHidden()
  })
})
