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
  screen,
  within,
} from '@testing-library/react'
import FileGallery from './FileGallery'

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

// PdfThumbnail loads pdfjs-dist (canvas/Worker) — irrelevant to the
// gallery shell behavior under test here, and not something jsdom
// supports. Carousel is a static import (not dynamic), so this only
// affects the PDF fallback-thumbnail branch, same as File.test.js.
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

afterEach(cleanup)

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
})

const LONG_NAME =
  'a-truly-excessive-filename-that-should-be-truncated-in-the-ui-instead-of-blowing-out-the-layout-and-wrapping-everywhere.png'

function imageFile(overrides = {}) {
  return {
    name: 'photo.png',
    type: 'image/png',
    url: 'https://example.com/photo.png',
    ...overrides,
  }
}

function pdfFile(overrides = {}) {
  return {
    name: 'report.pdf',
    type: 'application/pdf',
    url: 'https://example.com/report.pdf',
    ...overrides,
  }
}

describe('FileGallery', () => {
  it('renders nothing for an empty file list', () => {
    const { container } = render(<FileGallery files={[]} />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })

  it('groups images and PDFs into separate grids without a dialog open', () => {
    render(<FileGallery files={[imageFile(), pdfFile()]} />)
    expect(
      screen.getByRole('button', { name: 'photo.png' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('report.pdf')
    ).toBeInTheDocument()
    expect(
      screen.getByText('file.images')
    ).toBeInTheDocument()
    expect(
      screen.getByText('file.documents')
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('omits the section heading when only one file type is present', () => {
    render(<FileGallery files={[imageFile()]} />)
    expect(screen.queryByText('file.images')).toBeNull()
  })

  it('falls back to the unsupported-file row for a legacy Office type', () => {
    render(
      <FileGallery
        files={[
          {
            name: 'old.doc',
            type: 'application/msword',
            url: 'https://example.com/old.doc',
          },
        ]}
      />
    )
    expect(
      screen.getByText('file.unsupported_legacy')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'old.doc' })
    ).toBeNull()
  })

  it('truncates long filenames with a title attribute carrying the full name', () => {
    render(
      <FileGallery
        files={[
          imageFile({ name: LONG_NAME }),
          pdfFile({
            name: LONG_NAME.replace('.png', '.pdf'),
          }),
        ]}
      />
    )
    const imageCaption = screen.getByTitle(LONG_NAME)
    expect(imageCaption).toHaveClass('truncate')
    const pdfCaption = screen.getByTitle(
      LONG_NAME.replace('.png', '.pdf')
    )
    expect(pdfCaption).toHaveClass('truncate')
  })

  it('opens an image in a lightbox with no counter or nav for a single image', () => {
    render(<FileGallery files={[imageFile()]} />)
    fireEvent.click(
      screen.getByRole('button', { name: 'photo.png' })
    )
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByTitle('photo.png')
    ).toBeInTheDocument()
    expect(
      within(dialog).queryByLabelText('file.previous')
    ).toBeNull()
    expect(
      within(dialog).queryByText(/\d+ \/ \d+/)
    ).toBeNull()
  })

  it('shows a counter and prev/next controls for multiple images', () => {
    render(
      <FileGallery
        files={[
          imageFile({ name: 'first.png' }),
          imageFile({
            name: 'second.png',
            url: 'https://example.com/second.png',
          }),
        ]}
      />
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'first.png' })
    )
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByText('1 / 2')
    ).toBeInTheDocument()
    expect(
      within(dialog).getByLabelText('file.previous')
    ).toBeInTheDocument()
    expect(
      within(dialog).getByLabelText('file.next')
    ).toBeInTheDocument()
  })

  it('opens a PDF in an inline viewer with an open-in-new-tab link', () => {
    render(<FileGallery files={[pdfFile()]} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: /report\.pdf/,
      })
    )
    const dialog = screen.getByRole('dialog')
    const iframe = dialog.querySelector('iframe')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute(
      'src',
      'https://example.com/report.pdf'
    )
    const link = within(dialog).getByRole('link', {
      name: /file\.open_new_tab/,
    })
    expect(link).toHaveAttribute(
      'href',
      'https://example.com/report.pdf'
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})
