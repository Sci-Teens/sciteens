// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
} from '@testing-library/react'
import RenderFile from './File'
import { LEGACY_UNSUPPORTED_MIME_TYPES } from '../context/helpers'

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

// PdfThumbnail loads pdfjs-dist (canvas/Worker) — irrelevant to the
// shell behavior under test here, and not something jsdom supports.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

afterEach(cleanup)

beforeAll(() => {
  // jsdom doesn't implement createObjectURL; File.js calls it directly
  // for every clickable (pdf/image) branch.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
})

function makeFile(name, type) {
  return new File([new Blob(['x'])], name, { type })
}

describe('RenderFile', () => {
  it.each(LEGACY_UNSUPPORTED_MIME_TYPES)(
    'renders a legacy Office type (%s) as non-clickable and unsupported',
    (type) => {
      const { container, getByText } = render(
        <RenderFile
          file={makeFile('report.doc', type)}
          id={0}
        />
      )
      expect(container.querySelector('a')).toBeNull()
      expect(
        getByText('file.unsupported_legacy')
      ).toBeInTheDocument()
      expect(getByText('report.doc')).toBeInTheDocument()
    }
  )

  it('renders an unrecognized type as non-clickable too', () => {
    const { container, getByText } = render(
      <RenderFile
        file={makeFile('weird.bin', 'application/x-weird')}
        id={0}
      />
    )
    expect(container.querySelector('a')).toBeNull()
    expect(
      getByText('file.unknown_type')
    ).toBeInTheDocument()
  })

  it('renders a PDF as a clickable link with its name', () => {
    const { container, getByText } = render(
      <RenderFile
        file={makeFile('poster.pdf', 'application/pdf')}
        id={0}
      />
    )
    const anchor = container.querySelector('a')
    expect(anchor).not.toBeNull()
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(getByText('poster.pdf')).toBeInTheDocument()
  })

  it('renders an image as a clickable link with a thumbnail', () => {
    const { container } = render(
      <RenderFile
        file={makeFile('photo.png', 'image/png')}
        id={0}
      />
    )
    expect(container.querySelector('a')).not.toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('wires the remove button through for an unsupported file', () => {
    const removeFile = vi.fn()
    const { getByRole } = render(
      <RenderFile
        file={makeFile(
          'old.ppt',
          'application/vnd.ms-powerpoint'
        )}
        id={3}
        removeFile={removeFile}
      />
    )
    fireEvent.click(getByRole('button'))
    expect(removeFile).toHaveBeenCalledWith(
      expect.anything(),
      3
    )
  })

  it('omits the remove button when removeFile is not provided', () => {
    const { queryByRole } = render(
      <RenderFile
        file={makeFile(
          'old.ppt',
          'application/vnd.ms-powerpoint'
        )}
        id={0}
      />
    )
    expect(queryByRole('button')).toBeNull()
  })

  it('renders an already-uploaded PDF descriptor (no blob) as a clickable link', () => {
    const { container, getByText } = render(
      <RenderFile
        file={{
          name: 'report.pdf',
          type: 'application/pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report.pdf',
        }}
        id={0}
      />
    )
    const anchor = container.querySelector('a')
    expect(anchor).toHaveAttribute(
      'href',
      'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report.pdf'
    )
    expect(getByText('report.pdf')).toBeInTheDocument()
  })

  it('renders an already-uploaded image descriptor (no blob) via its url', () => {
    const { container } = render(
      <RenderFile
        file={{
          name: 'photo.png',
          type: 'image/png',
          url: 'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/photo.png',
        }}
        id={0}
      />
    )
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/photo.png'
    )
  })

  it('uses a persisted thumbnailUrl instead of live pdfjs rendering', () => {
    const { container } = render(
      <RenderFile
        file={{
          name: 'report.pdf',
          type: 'application/pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report.pdf',
          thumbnailUrl:
            'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report-thumb.png',
        }}
        id={0}
      />
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute(
      'src',
      'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report-thumb.png'
    )
  })

  it('falls back to live PdfThumbnail rendering without a thumbnailUrl', () => {
    const { container } = render(
      <RenderFile
        file={{
          name: 'report.pdf',
          type: 'application/pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report.pdf',
        }}
        id={0}
      />
    )
    // next/dynamic is mocked to a component rendering null, so there's
    // no <img> from the persisted-thumbnail branch here.
    expect(container.querySelector('img')).toBeNull()
  })

  // A record's url is written by whoever owns the profile/project, so
  // a non-Storage url must never become an href a visitor can click.
  it.each([
    'javascript:alert(document.domain)',
    'data:text/html,<script>alert(1)</script>',
    'https://evil.example/report.pdf',
  ])('never links a %s url', (url) => {
    const { container } = render(
      <RenderFile
        file={{
          name: 'report.pdf',
          type: 'application/pdf',
          url,
        }}
        id={0}
      />
    )
    expect(container.querySelector('a')).toBeNull()
  })

  it('never renders a hostile thumbnailUrl as an image source', () => {
    const { container } = render(
      <RenderFile
        file={{
          name: 'report.pdf',
          type: 'application/pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/sciteens.appspot.com/o/report.pdf',
          thumbnailUrl: 'javascript:alert(1)',
        }}
        id={0}
      />
    )
    expect(container.querySelector('img')).toBeNull()
  })
})
