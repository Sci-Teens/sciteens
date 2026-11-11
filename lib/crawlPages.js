import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
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
  const snapshot = await getDocs(
    query(
      collection(db, section),
      isProject
        ? orderBy('date', 'desc')
        : orderBy(documentId()),
      limit(page * size + 5)
    )
  )
  const items = snapshot.docs
    .map((document) => {
      const record = { ...document.data(), id: document.id }
      if (isProject)
        return normalizeProject({
          ...record,
          date:
            record.date?.toDate?.().toISOString() ||
            record.date,
        })
      const slug = record.slug || record.id
      return canonicalProgramSlug(slug) === slug
        ? normalizeOpportunityListing({ ...record, slug })
        : null
    })
    .filter(Boolean)

  return JSON.parse(
    JSON.stringify(sliceListingPage(items, section, page))
  )
}
