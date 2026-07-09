// Minimal `.env.local` reader — playwright.config.js needs to know
// before deciding whether to start the "live" webServer at all.
const fs = require('node:fs')
const path = require('node:path')

function readEnvLocal() {
  const envPath = path.resolve(
    __dirname,
    '../../.env.local'
  )
  const result = {}
  if (!fs.existsSync(envPath)) return result

  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

module.exports = { readEnvLocal }
