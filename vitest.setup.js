import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia; embla-carousel-react (used by
// components/ui/carousel.jsx) calls it unconditionally on mount to watch
// for reduced-motion / RTL media queries, so any jsdom test that mounts a
// <Carousel> needs this stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// Same gap for Resize/IntersectionObserver — embla watches container and
// slide visibility changes with both, and jsdom implements neither.
if (
  typeof window !== 'undefined' &&
  !window.ResizeObserver
) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (
  typeof window !== 'undefined' &&
  !window.IntersectionObserver
) {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
