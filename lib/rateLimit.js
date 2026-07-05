// Tiny in-memory rate limiter for serverless routes.
// Not distributed — each warm function instance keeps its own map.
// Good enough to blunt abuse of the toxicity proxy; for harder limits
// use Firebase App Check or an external rate-limit service.

const buckets = new Map()

// Returns true if the request is allowed, false if rate-limited.
export default function rateLimit(key, max, windowMs) {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  entry.count += 1
  return entry.count <= max
}
