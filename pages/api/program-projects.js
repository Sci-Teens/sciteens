import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

import firebaseConfig from '@/firebaseConfig'
import { fetchProgramProjectsPage } from '@/lib/programProjects'
const OPPORTUNITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({
      error: 'This method is not allowed.',
    })
  }

  const opportunityId = firstQueryValue(
    req.query.opportunity
  )
  const cursor = firstQueryValue(req.query.cursor) || null
  if (
    typeof opportunityId !== 'string' ||
    opportunityId.length > 120 ||
    !OPPORTUNITY_ID.test(opportunityId) ||
    (cursor !== null &&
      (typeof cursor !== 'string' ||
        cursor.includes('/') ||
        Buffer.byteLength(cursor, 'utf8') > 1500))
  ) {
    return res.status(400).json({
      error: 'The project query is invalid.',
    })
  }

  try {
    const app = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    const result = await fetchProgramProjectsPage(
      getFirestore(app),
      opportunityId,
      cursor
    )

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    )
    return res.status(200).json(result)
  } catch (error) {
    console.error('Program projects request failed:', error)
    return res.status(500).json({
      error: 'Program projects are unavailable.',
    })
  }
}
