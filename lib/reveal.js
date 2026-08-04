import { useEffect, useState } from 'react'
import { config } from '@react-spring/web'

// Shared scroll-in treatment for the marketing pages (home, about,
// get-involved, donate) so they all settle with the same spring instead
// of drifting to per-page easings.
//
// Transform-only, deliberately. A section is only revealed once hydration
// has run and its IntersectionObserver has fired, so any section tall
// enough to reach the initial viewport (/about's #mission) would hold its
// text at opacity 0 through first paint and become the LCP element at 5.9s.
// Sliding an already-opaque element cannot delay paint, and transforms do
// not register as layout shift. See also `.reveal-up` in styles/globals.css,
// which does the same job for above-the-fold content without any JS.
//
// No `from`: the hidden branch is already the initial render value, and
// re-supplying `from` restarts every spring whenever any section
// scrolls in.
export function riseUp(visible, overrides) {
  return {
    transform: visible
      ? 'translateY(0px)'
      : 'translateY(20px)',
    config: config.gentle,
    ...overrides,
  }
}

// Reveals each id the first time its element scrolls into view.
//
// `threshold: 0` is deliberate. intersectionRatio is measured against the
// target's own box, so a section taller than the viewport can never reach
// a fractional threshold: /about's 28-card roster is ~4300px, which caps
// the ratio at 0.14 on a 667px-tall phone and would leave the page's main
// content stuck at opacity 0 forever. The bottom rootMargin, not the
// threshold, is what holds the reveal back until the section is properly
// on screen.
//
// An id with no element is marked visible rather than skipped, so a
// section that renders later can never be permanently invisible; same
// reasoning as the missing-IntersectionObserver branch.
export function useSectionReveal(ids) {
  const [visible, setVisible] = useState({})

  // Effect identity tracks the ids themselves, not the array reference,
  // so a caller that builds the list inline doesn't rebuild the observer
  // on every render.
  const key = ids.join()

  useEffect(() => {
    const sectionIds = key.split(',')

    if (!('IntersectionObserver' in window)) {
      setVisible(
        Object.fromEntries(
          sectionIds.map((id) => [id, true])
        )
      )
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          setVisible((current) => ({
            ...current,
            [entry.target.id]: true,
          }))
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    )

    const orphans = []
    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
      else orphans.push([id, true])
    })
    if (orphans.length) {
      setVisible((current) => ({
        ...current,
        ...Object.fromEntries(orphans),
      }))
    }

    return () => observer.disconnect()
  }, [key])

  return visible
}
