import { describe, expect, it, vi } from 'vitest'

const {
  deleteProjectBatch,
} = require('./reindex-meilisearch')

describe('deleteProjectBatch', () => {
  it('uses the Meilisearch bulk ID deletion endpoint', async () => {
    const meili = vi.fn().mockResolvedValue({ taskUid: 42 })

    await deleteProjectBatch(meili, ['stale-a', 'stale-b'])

    expect(meili).toHaveBeenCalledWith(
      '/indexes/projects/documents/delete-batch',
      {
        method: 'POST',
        body: ['stale-a', 'stale-b'],
      }
    )
  })
})
