import { test, expect } from '@playwright/test'
import { selectWorkspace } from './utils/mock'

test.describe('Nested Sidebar & Renaming', () => {
  test.beforeEach(async ({ page }) => {
    // Extended Mock for Nesting
    await page.addInitScript(() => {
      const mockFiles = {
        '/Users/josh/RadCMS/deep-workspace': [
          { name: 'root.md', isFile: true, isDirectory: false, path: '/Users/josh/RadCMS/deep-workspace/root.md' },
          { name: 'folder', isFile: false, isDirectory: true, path: '/Users/josh/RadCMS/deep-workspace/folder' }
        ],
        '/Users/josh/RadCMS/deep-workspace/folder': [
          {
            name: 'nested.md',
            isFile: true,
            isDirectory: false,
            path: '/Users/josh/RadCMS/deep-workspace/folder/nested.md'
          }
        ]
      }

      const mockContent = {
        '/Users/josh/RadCMS/deep-workspace/root.md': '# Root',
        '/Users/josh/RadCMS/deep-workspace/folder/nested.md': '# Nested Content'
      }

      const recentWorkspaces = ['/Users/josh/RadCMS/deep-workspace']

      ;(window as any).cms = {
        fs: {
          readdir: async (path: string) => {
            return mockFiles[path] || []
          },
          read: async (path: string) => {
            return mockContent[path] || ''
          },
          write: async (path: string, content: string) => {
            console.log(`[MockFS] Write ${path}: ${content}`)
            mockContent[path] = content
            // Simulating update of name for renaming test if needed,
            // but usually rename involves a move command which we might need to add to the API.
          },
          rename: async (oldPath: string, newPath: string) => {
            console.log(`[MockFS] Rename ${oldPath} -> ${newPath}`)
            const content = mockContent[oldPath]
            delete mockContent[oldPath]
            mockContent[newPath] = content

            // Update file list simulation
            const parentDir = oldPath.substring(0, oldPath.lastIndexOf('/'))
            const entries = mockFiles[parentDir]
            if (entries) {
              const entry = entries.find((e) => e.path === oldPath)
              if (entry) {
                entry.name = newPath.split('/').pop()!
                entry.path = newPath
              }
            }
          }
        },
        git: {
          getStatus: async () => false,
          publish: async () => {},
          fetch: async () => {}
        },
        rad: {
          getIdentity: async () => 'did:key:test\nTest User'
        }
      }

      localStorage.setItem('rad-cms-workspaces', JSON.stringify(recentWorkspaces))
    })

    await page.goto('/')
    await selectWorkspace(page, 'deep-workspace')
  })

  test('Renders nested folder structure', async ({ page }) => {
    // Root file visible
    await expect(page.locator('span.truncate', { hasText: 'root.md' })).toBeVisible()

    // Folder visible
    const folder = page.locator('span.truncate', { hasText: 'folder' })
    await expect(folder).toBeVisible()

    // Nested file should be visible (if strictly eager load) or after click (if lazy).
    // For simpler "Notion-like" assumption with small workspaces, let's assume eager load or click to expand.
    // If it's a folder, we likely need to click it to see children in the sidebar logic if it's collapsible.
    // Note: The previous logic was just a flat list of `workspaceStore.state.files`.
    // We need to verify it handles the directory type now.

    // Let's assume we want to click the folder to toggle, or it simply lists everything flat if we don't have tree yet.
    // But the requirement is "Nested File Structure".
    // So we expect 'nested.md' to be visible, possibly indented or under the folder.
    // If valid tree logic is implemented, we might need to expand 'folder'.
    await folder.click()

    await expect(page.locator('span.truncate', { hasText: 'nested.md' })).toBeVisible()
  })

  test('Renaming a page', async ({ page }) => {
    await page.locator('span.truncate', { hasText: 'root.md' }).click()

    const titleInput = page.locator('input.text-4xl')
    await expect(titleInput).toBeEnabled() // Should now be enabled

    await titleInput.fill('renamed.md')
    await titleInput.blur() // Trigger save/rename

    // Verify sidebar updates (store update)
    // Sidebar usually in w-60 container
    await expect(page.locator('.bg-\\[\\#F7F7F5\\] span.truncate', { hasText: 'renamed.md' })).toBeVisible()
    await expect(page.locator('.bg-\\[\\#F7F7F5\\] span.truncate', { hasText: 'root.md' })).not.toBeVisible()

    // Verify Breadcrumbs update
    const topBar = page.locator('.sticky.top-0')
    await expect(topBar.getByText('renamed.md')).toBeVisible()
  })
})
