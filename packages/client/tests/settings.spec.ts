import { test, expect } from '@playwright/test'
import { setupMockCms } from './utils/mock'

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
  })

  test('Can navigate tabs and interact with settings', async ({ page }) => {
    await page.getByText('Settings').click()

    const modal = page.locator('.settings-modal')

    // Check General Tab Default
    await expect(modal.locator('h2', { hasText: 'General' })).toBeVisible()
    await expect(modal.getByText('Current Workspace')).toBeVisible()

    // Check Identity Display Robustness
    // Mock identity is "did:key:test\nTest User" -> "Test User (did:key:test)"
    await expect(modal.getByText('Test User')).toBeVisible()
    await expect(modal.getByText('did:key:test')).toBeVisible()

    // Switch to Appearance
    await modal.getByText('Appearance').click()
    await expect(modal.locator('h2', { hasText: 'Appearance' })).toBeVisible()
    await expect(modal.getByText('Theme')).toBeVisible()

    // Interact with Theme (Mock interaction)
    const themeSelect = modal.locator('select') // Assumes select for theme
    await expect(themeSelect).toHaveValue('system') // Check default is System with fallback

    await themeSelect.selectOption('dark')

    // Check if class is applied
    await expect(page.locator('html')).toHaveClass(/dark/)

    await themeSelect.selectOption('light')
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // System mode logic is hard to test unless we mock media match, but we can verify selection
    await themeSelect.selectOption('system')
    await expect(themeSelect).toHaveValue('system')

    // Switch back to General
    await modal.getByText('General').first().click()
    await expect(modal.locator('h2', { hasText: 'General' })).toBeVisible()
  })
})
