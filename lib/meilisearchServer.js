const SEARCH_REQUEST_TIMEOUT_MS = 8000

function configuredSearch() {
  const hostValue = process.env.MEILI_HOST
  const searchKey = process.env.MEILI_SEARCH_KEY
  if (!hostValue || !searchKey) {
    throw Object.assign(
      new Error('Meilisearch is not configured.'),
      { statusCode: 503 }
    )
  }

  let host
  try {
    host = new URL(hostValue)
  } catch {
    throw Object.assign(
      new Error('MEILI_HOST is not a valid URL.'),
      { statusCode: 503 }
    )
  }
  if (
    !['http:', 'https:'].includes(host.protocol) ||
    host.username ||
    host.password ||
    (process.env.NODE_ENV === 'production' &&
      host.protocol !== 'https:')
  ) {
    throw Object.assign(
      new Error('MEILI_HOST is not secure.'),
      { statusCode: 503 }
    )
  }

  return {
    endpoint: `${host.origin}${host.pathname.replace(
      /\/+$/,
      ''
    )}`,
    searchKey,
  }
}

export async function meiliMultiSearch(queries) {
  const { endpoint, searchKey } = configuredSearch()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    SEARCH_REQUEST_TIMEOUT_MS
  )

  try {
    const response = await fetch(
      `${endpoint}/multi-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${searchKey}`,
        },
        body: JSON.stringify({ queries }),
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    if (!response.ok) {
      throw Object.assign(
        new Error(
          `Meilisearch returned status ${response.status}.`
        ),
        { statusCode: 502 }
      )
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}
