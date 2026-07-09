// Mobile nav Sheet a11y. Pins down
// that @base-ui/react's Dialog primitive (behind NavBar.js's Sheet)
// actually delivers focus trap, Escape-to-close, and focus
// restoration in a real browser.
const { test, expect } = require('@playwright/test')

test.use({ viewport: { width: 390, height: 844 } })

test.describe('mobile nav Sheet a11y', () => {
  test('Tab cycles inside the sheet, Escape closes and restores focus', async ({
    page,
  }) => {
    await page.goto('/')

    const trigger = page.getByRole('button', {
      name: 'Menu',
    })
    await expect(trigger).toBeVisible()
    await trigger.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('link', { name: 'Home' })
    ).toBeVisible()

    // Every focused element must stay inside the sheet (real trap).
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const focusInsideDialog = await page.evaluate(
        () =>
          document.activeElement?.closest(
            '[role="dialog"]'
          ) !== null
      )
      expect(focusInsideDialog).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
