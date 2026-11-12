import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore'
import { db } from './firestore'
import { normalizeProject } from './projects'
import { normalizeOpportunityListing } from './opportunities'
import { canonicalProgramSlug } from './legacyRoutes.cjs'
import {
  CRAWL_PAGE_SIZES,
  sliceListingPage,
} from './crawlPagination'

export async function fetchListingArchive(section, page) {
  const size = CRAWL_PAGE_SIZES[section]
  const isProject = section === 'projects'
  const items = []
  const batchSize = page * size + 5
  let cursor

  while (items.length <= page * size) {
    const snapshot = await getDocs(
      query(
        collection(db, section),
        isProject
          ? orderBy('date', 'desc')
          : orderBy(documentId()),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(batchSize)
      )
    )
    for (const document of snapshot.docs) {
      const record = { ...document.data(), id: document.id }
      if (isProject) {
        items.push(
          normalizeProject({
            ...record,
            date:
              record.date?.toDate?.().toISOString() ||
              record.date,
          })
        )
      } else {
        const slug = record.slug || record.id
        if (canonicalProgramSlug(slug) === slug) {
          items.push(
            normalizeOpportunityListing({ ...record, slug })
          )
        }
      }
    }
    if (snapshot.docs.length < batchSize) break
    cursor = snapshot.docs.at(-1)
  }

  return JSON.parse(
    JSON.stringify(sliceListingPage(items, section, page))
  )
}
