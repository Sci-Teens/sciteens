// next dev compiles routes on demand; the first visit to a route
// may not have hydrated when fill() fires its events, so
// react-hook-form never sees the values and the submit button
// stays disabled. Wait for React to attach its fiber to an input
// (only present after hydration) before filling.
async function waitForHydration(page, selector) {
  await page.waitForFunction(
    (sel) =>
      Object.keys(document.querySelector(sel) || {}).some(
        (k) => k.startsWith('__reactFiber')
      ),
    selector,
    { timeout: 15_000 }
  )
}

module.exports = { waitForHydration }
