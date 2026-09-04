import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

import firebaseConfig from '@/firebaseConfig'
import { fetchOpportunityOptions } from '@/lib/opportunities'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({
      error: 'This method is not allowed.',
    })
  }

  if (Object.keys(req.query || {}).length > 0) {
    return res.status(400).json({
      error:
        'This request does not accept query parameters.',
    })
  }

  try {
    const app = getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    const opportunities = await fetchOpportunityOptions(
      getFirestore(app)
    )

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    )
    return res.status(200).json({ opportunities })
  } catch (error) {
    console.error(
      'Opportunity options request failed:',
      error
    )
    return res.status(500).json({
      error: 'Opportunity options are unavailable.',
    })
  }
}
