import { describe, expect, it, vi } from 'vitest'

const {
  deleteDocumentBatch,
  parseArgs,
} = require('./reindex-meilisearch')

describe('deleteDocumentBatch', () => {
  it('uses the selected Meilisearch bulk deletion endpoint', async () => {
    const meili = vi.fn().mockResolvedValue({ taskUid: 42 })

    await deleteDocumentBatch(meili, 'opportunities', [
      'stale-a',
      'stale-b',
    ])

    expect(meili).toHaveBeenCalledWith(
      '/indexes/opportunities/documents/delete-batch',
      {
        method: 'POST',
        body: ['stale-a', 'stale-b'],
      }
    )
  })
})

describe('parseArgs', () => {
  it('accepts one index for a targeted backfill', () => {
    expect(
      parseArgs(['--execute', '--index', 'opportunities'])
    ).toEqual({
      execute: true,
      project: undefined,
      index: 'opportunities',
    })
  })

  it('rejects an unknown index', () => {
    expect(() =>
      parseArgs(['--index', 'students'])
    ).toThrow('--index must be projects or opportunities.')
  })
})
