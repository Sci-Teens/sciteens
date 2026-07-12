// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import InfiniteScrollTrigger from './InfiniteScrollTrigger'

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

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

afterEach(() => {
  cleanup()
  MockIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

describe('InfiniteScrollTrigger', () => {
  it('loads the next page before the trigger reaches the viewport', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const onLoadMore = vi.fn()

    render(
      <InfiniteScrollTrigger
        hasNextPage
        isLoading={false}
        onLoadMore={onLoadMore}
        label="Load more"
      />
    )

    const observer = MockIntersectionObserver.instances[0]
    expect(observer.options).toEqual({
      rootMargin: '600px 0px',
    })
    expect(observer.observe).toHaveBeenCalledOnce()

    act(() => {
      observer.callback([{ isIntersecting: true }])
    })
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('keeps a manual load button when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const onLoadMore = vi.fn()

    render(
      <InfiniteScrollTrigger
        hasNextPage
        isLoading={false}
        onLoadMore={onLoadMore}
        label="Load more"
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Load more' })
    )
    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('disconnects the observer and disables loading twice while a request is active', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )
    const onLoadMore = vi.fn()
    const { rerender } = render(
      <InfiniteScrollTrigger
        hasNextPage
        isLoading={false}
        onLoadMore={onLoadMore}
        label="Load more"
      />
    )
    const observer = MockIntersectionObserver.instances[0]

    rerender(
      <InfiniteScrollTrigger
        hasNextPage
        isLoading
        onLoadMore={onLoadMore}
        label="Load more"
      />
    )

    expect(observer.disconnect).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: /Load more/ })
    ).toBeDisabled()
  })

  it('renders no trigger after the final page', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver
    )

    render(
      <InfiniteScrollTrigger
        hasNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        label="Load more"
      />
    )

    expect(screen.queryByRole('button')).toBeNull()
    expect(MockIntersectionObserver.instances).toHaveLength(
      0
    )
  })
})
