// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import Discussion from './Discussion'
import { MESSAGE_CODE } from '../lib/toxicity'

// lib/toxicity.test.js covers the pure scoring logic in isolation; what it
// can't reach without a real browser is the message-protocol wiring around
// it — Discussion.js's debounced postMessage to lib/toxicityWorker.js and
// its handling of RESPONSE_READY/MODEL_ERROR/INFERENCE_ERROR. A mocked
// `Worker` global exercises that wiring directly, without loading the
// actual ONNX model.

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    isReady: true,
    basePath: '',
    locale: 'en',
  }),
}))

vi.mock('../lib/firebase', () => ({ db: {} }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/firestoreData', () => ({
  useFirestoreCollectionData: () => ({ data: [] }),
}))

vi.mock('../context/AuthContext', () => ({
  useSigninCheck: () => ({
    data: {
      signedIn: true,
      user: { uid: 'u1', displayName: 'Test User' },
    },
  }),
}))

class MockWorker {
  constructor(url, options) {
    this.url = url
    this.options = options
    this.onmessage = null
    this.postMessage = vi.fn()
    this.terminate = vi.fn()
    MockWorker.instances.push(this)
  }
}
MockWorker.instances = []

function latestWorker() {
  return MockWorker.instances[
    MockWorker.instances.length - 1
  ]
}

function respond(worker, code, payload) {
  act(() => {
    worker.onmessage({ data: { code, payload } })
  })
}

function typeComment(text) {
  const textarea = screen.getByRole('textbox', {
    name: 'discussion.comment_label',
  })
  fireEvent.change(textarea, { target: { value: text } })
}

beforeEach(() => {
  vi.useFakeTimers()
  MockWorker.instances = []
  vi.stubGlobal('Worker', MockWorker)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Discussion toxicity worker wiring', () => {
  it('creates the worker on mount and terminates it on unmount', () => {
    const { unmount } = render(
      <Discussion type="project" item_id="p1" />
    )
    expect(MockWorker.instances).toHaveLength(1)
    const worker = latestWorker()
    unmount()
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('posts the trimmed comment to the worker after the debounce window', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('  This is a fine comment  ')
    expect(worker.postMessage).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(worker.postMessage).toHaveBeenCalledWith(
      'This is a fine comment'
    )
  })

  it('shows the required-field error on empty input without posting to the worker', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('something')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    worker.postMessage.mockClear()

    typeComment('')
    expect(
      screen.getByText('Please submit a comment')
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(worker.postMessage).not.toHaveBeenCalled()
  })

  it('blocks oversized text before it ever reaches the worker', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('a'.repeat(1001))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(
      screen.getByText(
        'This comment could not be submitted; please shorten it and try again.'
      )
    ).toBeInTheDocument()
    expect(worker.postMessage).not.toHaveBeenCalled()
  })

  it('surfaces a toxic RESPONSE_READY result and disables submit', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('some text')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: true,
      toxicityTypeList: 'toxic',
    })

    expect(
      screen.getByText(
        'Please refrain from submitting inappropriate comments'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /discussion\.post/,
      })
    ).toBeDisabled()
  })

  it('clears the error on a non-toxic RESPONSE_READY result', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('some text')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: true,
      toxicityTypeList: 'toxic',
    })
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: false,
      toxicityTypeList: '',
    })

    expect(
      screen.queryByText(
        'Please refrain from submitting inappropriate comments'
      )
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /discussion\.post/,
      })
    ).not.toBeDisabled()
  })

  it.each([
    MESSAGE_CODE.MODEL_ERROR,
    MESSAGE_CODE.INFERENCE_ERROR,
  ])(
    'fails open on %s instead of blocking the post',
    (code) => {
      render(<Discussion type="project" item_id="p1" />)
      const worker = latestWorker()

      typeComment('some text')
      act(() => {
        vi.advanceTimersByTime(500)
      })
      respond(worker, MESSAGE_CODE.RESPONSE_READY, {
        isToxic: true,
        toxicityTypeList: 'toxic',
      })
      respond(worker, code, null)

      expect(
        screen.queryByText(
          'Please refrain from submitting inappropriate comments'
        )
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', {
          name: /discussion\.post/,
        })
      ).not.toBeDisabled()
    }
  )
})
