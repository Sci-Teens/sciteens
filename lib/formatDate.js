// A date-time string with no offset (`2024-03-15T23:00`) is parsed as
// local time but formatted in UTC below, so the rendered day would
// depend on the machine doing the parsing. Read those as UTC too.
const OFFSETLESS_DATETIME = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/

function normalizeToUtc(value) {
  return typeof value === 'string' &&
    OFFSETLESS_DATETIME.test(value)
    ? `${value}Z`
    : value
}

// Intl instead of moment on the listing/detail paths. Output matches
// moment for `en` and `fr`; `es` loses the "de" connectives and `hi`
// renders Latin rather than Devanagari numerals, both of which are the
// CLDR defaults for those locales. Pinning UTC makes the server and
// client agree, so date cells no longer need a `mounted` guard to
// survive hydration.
export function formatMediumDate(value, locale = 'en') {
  if (value === undefined || value === null || value === '')
    return ''

  const date = value?.toDate
    ? value.toDate()
    : new Date(normalizeToUtc(value))

  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale || 'en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}
