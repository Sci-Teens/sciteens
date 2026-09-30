import { describe, expect, it, vi } from 'vitest'

const {
  createSourceIfMissing,
} = require('./seed-opportunity-sources')
const migrations = require('./data/opportunity-source-url-migrations.json')
const sources = require('./data/opportunity-sources.json')

function fixture(url) {
  const updateTime = { seconds: 123 }
  const ref = {
    get: vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        url,
        status: 'paused',
        consecutiveFailures: 4,
      }),
      updateTime,
    }),
    update: vi.fn(),
    set: vi.fn(),
  }
  const db = { collection: () => ({ doc: () => ref }) }
  return { db, ref, updateTime }
}

describe('curated source URL migrations', () => {
  it.each(migrations)(
    'updates only the verified URL for $slug',
    async (migration) => {
      const source = sources.find(
        ({ slug }) => slug === migration.slug
      )
      expect(source.url).toBe(migration.to)
      const { db, ref, updateTime } = fixture(
        migration.from
      )
      expect(
        await createSourceIfMissing(db, source, true)
      ).toBe('updated')
      expect(ref.update).toHaveBeenCalledWith(
        { url: migration.to },
        { lastUpdateTime: updateTime }
      )
      expect(ref.set).not.toHaveBeenCalled()
    }
  )

  it('preserves reviewer URL overrides', async () => {
    const source = sources.find(
      ({ slug }) => slug === migrations[0].slug
    )
    const { db, ref } = fixture(
      'https://example.org/reviewer-choice'
    )
    expect(
      await createSourceIfMissing(db, source, true)
    ).toBe('skipped')
    expect(ref.update).not.toHaveBeenCalled()
  })

  it('does not write in dry runs or repeat completed migrations', async () => {
    const migration = migrations[0]
    const source = sources.find(
      ({ slug }) => slug === migration.slug
    )
    const dry = fixture(migration.from)
    expect(
      await createSourceIfMissing(dry.db, source, false)
    ).toBe('updated')
    expect(dry.ref.update).not.toHaveBeenCalled()
    const applied = fixture(migration.to)
    expect(
      await createSourceIfMissing(applied.db, source, true)
    ).toBe('skipped')
    expect(applied.ref.update).not.toHaveBeenCalled()
  })

  it('fails safely if a concurrent edit invalidates the write precondition', async () => {
    const migration = migrations[0]
    const source = sources.find(
      ({ slug }) => slug === migration.slug
    )
    const { db, ref } = fixture(migration.from)
    ref.update.mockRejectedValue(
      new Error('FAILED_PRECONDITION')
    )
    await expect(
      createSourceIfMissing(db, source, true)
    ).rejects.toThrow('FAILED_PRECONDITION')
    expect(ref.set).not.toHaveBeenCalled()
  })
})
