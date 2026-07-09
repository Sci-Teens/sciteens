// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  renderHook,
} from '@testing-library/react'
import { useIntersectionObserver } from './helpers'

// Backs the infinite-scroll "load more" trigger on pages/articles.js and
// pages/projects.js (both called with forward=false). No jsdom
// IntersectionObserver exists by default, so it's mocked here to drive
// the hook's callback directly and assert on its two documented modes.
//
// `options` is hoisted to a stable reference per test (unlike the real
// callers, which pass an inline literal): the hook's effect keys off
// `[element, options]` identity, so a fresh literal would tear down and
// recreate the observer on every state-driven re-render, which is
// besides the point of what's under test here.

class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.observe = vi.fn()
    this.disconnect = vi.fn()
    MockIntersectionObserver.instances.push(this)
  }
}
MockIntersectionObserver.instances = []

function latestObserver() {
  return MockIntersectionObserver.instances[
    MockIntersectionObserver.instances.length - 1
  ]
}

function fireIntersection(observer, isIntersecting) {
  act(() => {
    observer.callback([{ isIntersecting }])
  })
}

afterEach(() => {
  cleanup()
  MockIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

describe('useIntersectionObserver', () => {
  it('observes ref.current once it is available', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const ref = { current: document.createElement('div') }
    const options = { threshold: 0 }

    renderHook(() =>
      useIntersectionObserver(ref, options, false)
    )

    expect(MockIntersectionObserver.instances).toHaveLength(
      1
    )
    const observer = latestObserver()
    expect(observer.options).toEqual(options)
    expect(observer.observe).toHaveBeenCalledWith(
      ref.current
    )
  })

  it('forward=false mirrors the live intersection state both ways', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const ref = { current: document.createElement('div') }
    const options = {}

    const { result } = renderHook(() =>
      useIntersectionObserver(ref, options, false)
    )
    expect(result.current).toBe(false)
    expect(MockIntersectionObserver.instances).toHaveLength(
      1
    )
    const observer = latestObserver()

    fireIntersection(observer, true)
    expect(result.current).toBe(true)

    fireIntersection(observer, false)
    expect(result.current).toBe(false)

    // Stable options/element never re-key the effect.
    expect(MockIntersectionObserver.instances).toHaveLength(
      1
    )
  })

  it('forward=true (default) latches true once and disconnects', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const ref = { current: document.createElement('div') }
    const options = {}

    const { result } = renderHook(() =>
      useIntersectionObserver(ref, options)
    )
    const observer = latestObserver()

    fireIntersection(observer, true)
    expect(result.current).toBe(true)
    expect(observer.disconnect).toHaveBeenCalledOnce()

    // A later false reading must not un-latch it back.
    fireIntersection(observer, false)
    expect(result.current).toBe(true)
  })

  it('disconnects the observer on unmount', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const ref = { current: document.createElement('div') }
    const options = {}

    const { unmount } = renderHook(() =>
      useIntersectionObserver(ref, options, false)
    )
    const observer = latestObserver()

    unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
  })
})
