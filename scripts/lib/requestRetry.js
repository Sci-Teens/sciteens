'use strict'

const RETRYABLE_STATUSES = new Set([
  429, 500, 502, 503, 504,
])
const RETRYABLE_CODES = new Set([
  'ABORT_ERR',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
])

function retryableError(error) {
  return (
    RETRYABLE_STATUSES.has(Number(error?.status)) ||
    RETRYABLE_CODES.has(
      error?.code || error?.cause?.code
    ) ||
    ['AbortError', 'TimeoutError'].includes(error?.name)
  )
}

function retryAfterMillis(value, now = Date.now()) {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds))
    return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : 0
}

function createRequestRunner({
  label,
  minIntervalMs = 1000,
  maxAttempts = 5,
  baseDelayMs = 5000,
  maxDelayMs = 60000,
  maxRetryAfterMs = 300000,
  sleep = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  random = Math.random,
  log = console.log,
} = {}) {
  let queue = Promise.resolve()
  let nextRequestAt = 0
  let cooldownError
  const stats = { requests: 0, retries: 0, exhausted: 0 }

  async function execute(request) {
    if (cooldownError && now() < nextRequestAt) {
      stats.exhausted += 1
      throw cooldownError
    }
    cooldownError = undefined
    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {
      const wait = nextRequestAt - now()
      if (wait > 0) await sleep(wait)
      stats.requests += 1
      nextRequestAt = now() + minIntervalMs
      try {
        return await request()
      } catch (error) {
        if (!retryableError(error)) throw error
        const serverDelay = retryAfterMillis(
          error.retryAfter,
          now()
        )
        const backoff = Math.min(
          maxDelayMs,
          baseDelayMs * 2 ** attempt
        )
        const delay = Math.max(
          serverDelay,
          backoff * (0.5 + random() * 0.5)
        )
        nextRequestAt = Math.max(
          nextRequestAt,
          now() + delay
        )
        if (
          attempt === maxAttempts - 1 ||
          serverDelay > maxRetryAfterMs
        ) {
          stats.exhausted += 1
          error.retryExhausted = true
          if (serverDelay > maxRetryAfterMs)
            cooldownError = error
          throw error
        }
        stats.retries += 1
        log(
          `  [RETRY] ${label}: transient failure, attempt ${
            attempt + 2
          }/${maxAttempts} in ${Math.ceil(delay / 1000)}s.`
        )
      }
    }
  }

  function run(request) {
    const result = queue.then(() => execute(request))
    queue = result.catch(() => {})
    return result
  }
  run.stats = stats
  return run
}

module.exports = {
  createRequestRunner,
  retryAfterMillis,
  retryableError,
}
