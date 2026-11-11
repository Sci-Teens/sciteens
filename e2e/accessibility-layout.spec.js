const { test, expect } = require('@playwright/test')

test.use({
  viewport: { width: 320, height: 700 },
  reducedMotion: 'reduce',
})

test('skip link moves keyboard focus past the shared navigation', async ({
  page,
}) => {
  await page.goto('/fr')
  await page
    .getByRole('button', { name: 'Menu', exact: true })
    .waitFor()
  const skipLink = page.getByRole('link', {
    name: 'Aller au contenu principal',
  })
  const main = page.getByRole('main')

  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(main).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(main.locator(':focus')).toBeVisible()
})

test('cookie banner fits narrow screens and keeps focused links visible', async ({
  page,
}) => {
  await page.goto('/fr')
  const accept = page.getByRole('button', {
    name: 'Accepter',
    exact: true,
  })
  await expect(accept).toBeInViewport({ ratio: 1 })

  const main = page.getByRole('main')
  await main.focus()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    await expect(main.locator(':focus')).toBeVisible()
    await expect
      .poll(() =>
        main.locator(':focus').evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          )
          return element.contains(hit)
        })
      )
      .toBe(true)
  }
})
