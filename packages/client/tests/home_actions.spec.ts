import { test, expect } from '@playwright/test'
import { selectWorkspace, setupMockCms } from './utils/mock'

test.describe('HomeView Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
    await selectWorkspace(page, 'test-workspace')
    // Ensure we are on Home View (might be there by default or need navigation)
    // If we opened a workspace, we might be on home view unless a file was persisted.
    // Let's force click "Home" in sidebar just in case.
    await page.getByText('Home').click()
  })

  test('Create a new page action', async ({ page }) => {
    // Find the "Create a new page" card
    const createCard = page.locator('text=Create a new page')
    await expect(createCard).toBeVisible()

    // Handle dialog before clicking
    page.on('dialog', (dialog) => dialog.accept('In Home Page'))

    // Click it
    await createCard.click()

    // Expect:
    // 1. A new file should be created (e.g. Untitled.md or with prompt)
    // 2. Editor should open

    // Option A: It prompts for name (using standard prompt which we need to mock/handle)
    // Option B: It auto-creates "Untitled.md"

    // Let's assume Option B for "Simplicity" first, or prompts.
    // User request: "Create a new page" ... logic in TODO was empty.
    // Current existing logic in Sidebar uses `workspaceStore.createWorkspace` but that's for workspaces.
    // Sidebar "Add a page" uses `setIsCreating` modal for Workspace creation? No wait.

    // Let's check Sidebar.tsx lines 259-261:
    // Sidebar "Add a page" -> setIsCreating(true) -> "New Workspace" modal.
    // This seems wrong? Sidebar "Add a page" creates a new WORKSPACE?
    // Let's check Sidebar.tsx code again.

    // In Sidebar.tsx:
    //  /* Pages / Favorites Section */
    //  ... onClick={() => { setIsCreating(true); }}
    // And isCreating shows "New Workspace" modal.
    // That seems like a BUG or "Half-baked" feature itself. "Add a page" shouldn't create a workspace.

    // But for HomeView, the TODO says "Create a new page".
    // Use case: Create a markdown file.

    // Let's assert that a file is created.
    // If we implement it as "Prompt for name", we need to handle dialog.
    // Dialog handled above.

    // Wait for editor element to appear first
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 })

    // Then check title
    const titleInput = page.locator('input[placeholder="Untitled"]')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue('In Home Page.md')

    // And it should appear in sidebar/breadcrumb
    // We might have multiple matches (Sidebar item + Editor breadcrumb), so just check one is visible
    await expect(page.locator('span.truncate', { hasText: 'In Home Page.md' }).first()).toBeVisible()
  })
})
