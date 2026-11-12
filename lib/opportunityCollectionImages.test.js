import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { fetchCollectionProgramImages } from './opportunityCollectionImages'
import { getDoc } from 'firebase/firestore'

vi.mock('./firestore', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, slug) => slug),
  getDoc: vi.fn(),
}))

describe('collection program imagery', () => {
  beforeEach(() => vi.clearAllMocks())
  it('uses directory media without copying other program data', async () => {
    getDoc.mockResolvedValueOnce({
      data: () => ({
        imageUrl:
          'https://storage.googleapis.com/program.webp',
        imageFit: 'contain',
        name: 'Different name',
        internalField: 'private',
      }),
    })
    const programs = await fetchCollectionProgramImages([
      { id: 'rsi', slug: 'rsi', name: 'RSI' },
    ])
    expect(programs).toEqual([
      {
        id: 'rsi',
        slug: 'rsi',
        name: 'RSI',
        imageUrl:
          'https://storage.googleapis.com/program.webp',
        imageFit: 'contain',
      },
    ])
  })

  it('keeps guides readable when a directory record or photo is absent', async () => {
    getDoc.mockResolvedValueOnce({ data: () => undefined })
    const programs = await fetchCollectionProgramImages([
      { id: 'aimi', slug: 'aimi' },
      { id: 'foundation' },
    ])
    expect(programs).toEqual([
      {
        id: 'aimi',
        slug: 'aimi',
        imageUrl: '',
        imageFit: 'cover',
      },
      { id: 'foundation' },
    ])
  })

  it('uses a curated photo instead of a poor directory image', async () => {
    const program = {
      id: 'primes',
      slug: 'mit-primes',
      imageUrl:
        '/assets/opportunity-guides/primes-usa.webp',
      imageFit: 'cover',
      imageSource:
        'https://math.mit.edu/research/highschool/primes/usa/',
    }
    await expect(
      fetchCollectionProgramImages([program])
    ).resolves.toEqual([program])
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('keeps the guide available if a directory media read fails', async () => {
    getDoc.mockRejectedValueOnce(new Error('unavailable'))
    await expect(
      fetchCollectionProgramImages([
        { id: 'rsi', slug: 'rsi' },
      ])
    ).resolves.toEqual([
      {
        id: 'rsi',
        slug: 'rsi',
        imageUrl: '',
        imageFit: 'cover',
      },
    ])
  })
})
