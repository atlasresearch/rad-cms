import { test, expect } from '@playwright/test'
import { setupMockCms } from './utils/mock'

test.describe('Sidebar Resizing', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockCms(page)
    await page.goto('/')
  })

  test('Can resize sidebar', async ({ page }) => {
    const sidebar = page.locator('.bg-\\[\\#F7F7F5\\]') // Main sidebar div
    // const resizer = page.locator('.sidebar-resizer'); // We need to add this class

    // Initial width check
    const box1 = await sidebar.boundingBox()
    expect(box1?.width).toBe(240) // w-60 = 240px

    // Find resizer
    const resizer = page.locator('.cursor-col-resize')

    // Drag it
    const resizerBox = await resizer.boundingBox() // Need to ensure it exists
    if (!resizerBox) throw new Error('Resizer not found')

    await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(resizerBox.x + 100, resizerBox.y) // Move right 100px
    await page.mouse.up()

    // Check new width
    const box2 = await sidebar.boundingBox()
    // Should be around 340
    expect(box2?.width).toBeGreaterThan(330)
    expect(box2?.width).toBeLessThan(350)
  })
})
