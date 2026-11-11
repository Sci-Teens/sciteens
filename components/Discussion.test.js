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
  within,
} from '@testing-library/react'
import Discussion from './Discussion'
import { MESSAGE_CODE } from '../lib/toxicity'
import { addDoc } from 'firebase/firestore'

// lib/toxicity.test.js covers the pure scoring logic in isolation; what it
// can't reach without a real browser is the message-protocol wiring around
// it — Discussion.js's debounced postMessage to lib/toxicityWorker.js and
// its handling of correlated classifier responses. A mocked
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

vi.mock('../lib/firestore', () => ({ db: {} }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn().mockResolvedValue(undefined),
}))

const { discussionState } = vi.hoisted(() => ({
  discussionState: { data: [] },
}))

vi.mock('../lib/firestoreData', () => ({
  useFirestoreCollectionData: () => discussionState,
}))

vi.mock('../context/AuthContext', () => ({
  useSigninCheck: () => ({
    data: {
      signedIn: true,
      user: { uid: 'u1', displayName: 'Test User' },
    },
  }),
}))

vi.mock('./ProfilePhoto', () => ({
  default: ({ uid }) => (
    <span data-testid={`photo-${uid || 'none'}`} />
  ),
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

function respond(
  worker,
  code,
  payload,
  request = worker.postMessage.mock.lastCall?.[0]
) {
  act(() => {
    worker.onmessage({
      data: {
        code,
        payload,
        id: request?.id,
        isReply: request?.isReply,
      },
    })
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
  discussionState.data = []
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
    expect(worker.postMessage).toHaveBeenCalledWith({
      id: expect.any(Number),
      text: 'This is a fine comment',
      isReply: false,
    })
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

  it('clears the error after a clean edit is classified', () => {
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
    typeComment('edited text')
    act(() => vi.advanceTimersByTime(500))
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

  it('fails open when the current draft cannot be classified', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()

    typeComment('some text')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    respond(worker, MESSAGE_CODE.INFERENCE_ERROR, null)

    expect(
      screen.getByRole('button', {
        name: /discussion\.post/,
      })
    ).not.toBeDisabled()
  })

  it('ignores a clean result for an older draft while the latest draft is pending', () => {
    render(<Discussion type="project" item_id="p1" />)
    const worker = latestWorker()
    const post = () =>
      screen.getByRole('button', {
        name: /discussion\.post/,
      })

    typeComment('older text')
    act(() => vi.advanceTimersByTime(500))
    const olderRequest = worker.postMessage.mock.lastCall[0]
    typeComment('newer text')
    act(() => vi.advanceTimersByTime(500))

    respond(
      worker,
      MESSAGE_CODE.RESPONSE_READY,
      { isToxic: false },
      olderRequest
    )
    expect(post()).toBeDisabled()
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: true,
    })
    expect(post()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please refrain from submitting inappropriate comments'
    )
  })
})

describe('Discussion author profile links', () => {
  it('links comment and reply authors to their profile pages', () => {
    discussionState.data = [
      {
        id: 'c1',
        uid: 'author-1',
        display: 'Ada Lovelace',
        comment: 'Interesting project',
        date: '2026-01-01T00:00:00.000Z',
        reply_to_id: '',
      },
      {
        id: 'r1',
        uid: 'author-2',
        display: 'Grace Hopper',
        comment: 'Agreed',
        date: '2026-01-02T00:00:00.000Z',
        reply_to_id: 'c1',
      },
    ]

    render(<Discussion type="projects" item_id="p1" />)

    const authorLink = screen.getByRole('link', {
      name: /Ada Lovelace/,
    })
    const replyLink = screen.getByRole('link', {
      name: /Grace Hopper/,
    })

    expect(authorLink).toHaveAttribute(
      'href',
      '/profile/author-1'
    )
    expect(replyLink).toHaveAttribute(
      'href',
      '/profile/author-2'
    )
  })
})

describe('Discussion forms', () => {
  beforeEach(() => {
    discussionState.data = [
      {
        id: 'c1',
        uid: 'author-1',
        display: 'Ada Lovelace',
        comment: 'Interesting project',
        date: '2026-01-01T00:00:00.000Z',
        reply_to_id: '',
      },
    ]
    vi.mocked(addDoc).mockClear()
  })

  it('opens the reply field with focus and returns focus on cancel', () => {
    render(<Discussion type="projects" item_id="p1" />)
    const trigger = screen.getByRole('button', {
      name: 'discussion.reply',
    })
    const replyField = () =>
      screen.queryByRole('textbox', {
        name: 'discussion.reply_label',
      })

    expect(replyField()).not.toBeInTheDocument()
    fireEvent.click(trigger)
    expect(replyField()).toHaveFocus()

    fireEvent.click(
      within(replyField().form).getByRole('button', {
        name: 'discussion.cancel',
      })
    )
    expect(replyField()).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('submits the comment form as a new thread even while a reply is open', async () => {
    render(<Discussion type="projects" item_id="p1" />)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'discussion.reply',
      })
    )
    typeComment('A new thread')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    respond(latestWorker(), MESSAGE_CODE.RESPONSE_READY, {
      isToxic: false,
    })

    const field = screen.getByRole('textbox', {
      name: 'discussion.comment_label',
    })
    await act(async () => {
      fireEvent.submit(field.form)
    })
    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        comment: 'A new thread',
        reply_to_id: '',
      })
    )
    expect(field).toHaveValue('')
  })

  it('keeps a reply draft and announces a failed submission', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(
      new Error('Offline')
    )
    render(<Discussion type="projects" item_id="p1" />)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'discussion.reply',
      })
    )
    const field = screen.getByRole('textbox', {
      name: 'discussion.reply_label',
    })
    fireEvent.change(field, {
      target: { value: 'A reply' },
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    respond(latestWorker(), MESSAGE_CODE.RESPONSE_READY, {
      isToxic: false,
    })

    await act(async () => {
      fireEvent.submit(field.form)
    })
    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        comment: 'A reply',
        reply_to_id: 'c1',
      })
    )
    expect(field).toHaveValue('A reply')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'discussion.post_failed'
    )
  })

  it('keeps a flagged comment blocked after checking a clean reply', () => {
    render(<Discussion type="projects" item_id="p1" />)
    const worker = latestWorker()
    typeComment('flagged text')
    act(() => vi.advanceTimersByTime(500))
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: true,
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: 'discussion.reply',
      })
    )
    const reply = screen.getByRole('textbox', {
      name: 'discussion.reply_label',
    })
    fireEvent.change(reply, {
      target: { value: 'A clean reply' },
    })
    act(() => vi.advanceTimersByTime(500))
    respond(worker, MESSAGE_CODE.RESPONSE_READY, {
      isToxic: false,
    })

    const comment = screen.getByRole('textbox', {
      name: 'discussion.comment_label',
    })
    expect(
      within(comment.form).getByRole('button', {
        name: 'discussion.post',
      })
    ).toBeDisabled()
    expect(
      within(reply.form).getByRole('button', {
        name: 'discussion.post',
      })
    ).not.toBeDisabled()
  })
})
