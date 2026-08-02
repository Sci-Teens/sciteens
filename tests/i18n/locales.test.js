import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The four locale bundles are hand-edited, so the only thing stopping a
// key from shipping English-only (or from lingering after its last
// caller is deleted) is that they stay in lockstep. next-i18next has no
// fallback beyond `en`, so a key missing from `hi` renders the raw dot
// path to the user.
const LOCALES = ['en', 'es', 'fr', 'hi']
const BASE = 'en'

function loadLocale(locale) {
  return JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        'public/locales',
        locale,
        'common.json'
      ),
      'utf8'
    )
  )
}

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, entry]) =>
    entry && typeof entry === 'object'
      ? flatten(entry, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  )
}

const bundles = Object.fromEntries(
  LOCALES.map((locale) => [locale, loadLocale(locale)])
)
const baseKeys = flatten(bundles[BASE]).sort()

function read(locale, key) {
  return key
    .split('.')
    .reduce((node, part) => node?.[part], bundles[locale])
}

describe('locale bundles', () => {
  // Plural keys are per-language in CLDR, so exact equality is only the
  // right contract while every locale here resolves to one/other. The
  // first locale that needs a `_many` or `_few` form (fr past 1e6, or a
  // new locale such as ar) has to relax this to a stem comparison.
  for (const locale of LOCALES.filter((l) => l !== BASE)) {
    it(`${locale} has exactly the same keys as ${BASE}`, () => {
      expect(flatten(bundles[locale]).sort()).toEqual(
        baseKeys
      )
    })
  }

  it('has no empty strings in any locale', () => {
    const empty = LOCALES.flatMap((locale) =>
      flatten(bundles[locale])
        .filter((key) => {
          const value = read(locale, key)
          return (
            typeof value === 'string' && value.trim() === ''
          )
        })
        .map((key) => `${locale}:${key}`)
    )
    expect(empty).toEqual([])
  })

  it('uses the ellipsis character, with no space before it', () => {
    const offenders = LOCALES.flatMap((locale) =>
      flatten(bundles[locale])
        .filter((key) => {
          const value = read(locale, key)
          return (
            typeof value === 'string' &&
            (value.includes('...') || value.includes(' …'))
          )
        })
        .map((key) => `${locale}:${key}`)
    )
    expect(offenders).toEqual([])
  })

  it('keeps interpolation placeholders identical across locales', () => {
    const placeholders = (value) =>
      (String(value ?? '').match(/{{\s*[\w.]+\s*}}/g) ?? [])
        .map((token) => token.replace(/\s/g, ''))
        .sort()

    const mismatches = []
    for (const key of baseKeys) {
      const expected = placeholders(read(BASE, key))
      for (const locale of LOCALES.filter(
        (l) => l !== BASE
      )) {
        const actual = placeholders(read(locale, key))
        if (actual.join('|') !== expected.join('|')) {
          mismatches.push(
            `${locale}:${key} has ${JSON.stringify(
              actual
            )}, expected ${JSON.stringify(expected)}`
          )
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})
