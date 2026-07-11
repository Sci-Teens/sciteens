import { useSyncExternalStore } from 'react'

// One scroll listener shared across every component that needs
// scroll direction, instead of each mounting its own. Direction
// only changes when the user crosses a distance threshold, so
// subscribers re-render a few times per scroll gesture, not
// per animation frame.
const SCROLL_THRESHOLD = 200
const TOP_OFFSET = 350

let direction = 'at-top'
let previousY = 0
const listeners = new Set()

function handleScroll() {
  const currentY = document.documentElement.scrollTop
  let next = direction

  if (currentY <= TOP_OFFSET) {
    next = 'at-top'
  } else if (currentY - previousY >= SCROLL_THRESHOLD) {
    next = 'down'
  } else if (previousY - currentY >= SCROLL_THRESHOLD) {
    next = 'up'
  }

  previousY = currentY

  if (next !== direction) {
    direction = next
    listeners.forEach((l) => l())
  }
}

function subscribe(callback) {
  if (typeof document === 'undefined') return () => {}
  listeners.add(callback)
  if (listeners.size === 1) {
    previousY = document.documentElement.scrollTop
    direction =
      previousY <= TOP_OFFSET ? 'at-top' : direction
    document.addEventListener('scroll', handleScroll, {
      passive: true,
    })
  }
  return () => {
    listeners.delete(callback)
    if (listeners.size === 0) {
      document.removeEventListener('scroll', handleScroll)
    }
  }
}

function getSnapshot() {
  return direction
}

function getServerSnapshot() {
  return 'at-top'
}

export function useScrollDirection() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
}
