'use strict'

const { z } = require('zod')

const FIELD_TAXONOMY = [
  'Biology',
  'Chemistry',
  'Cognitive Science',
  'Computer Science',
  'Earth Science',
  'Electrical Engineering',
  'Environmental Science',
  'Mathematics',
  'Mechanical Engineering',
  'Medicine',
  'Physics',
  'Space Science',
]

const PROGRAM_TYPE_TAXONOMY = [
  'Summer Program',
  'Academic Year Program',
  'Competition',
  'Internship',
  'Research Experience',
  'Scholarship',
  'Online Course',
  'Fellowship',
  'Camp',
  'Other',
]

const RESIDENTIAL_OPTIONS = [
  'Residential',
  'Commuter',
  'Not applicable',
  'Not specified',
]

// consultedPages is the per-run provenance the model emits alongside
// the final extraction: every URL it called fetch_page on, paired with
// a short role label describing what it learned there. We persist it
// on opportunity-sources/{slug} so future runs can pre-fetch the same
// pages and skip the multi-turn link-discovery loop on sources whose
// structure is stable. The model is asked to be honest about which
// page actually held which fact -- bogus entries defeat the point.
const ConsultationEntrySchema = z.object({
  url: z.string().url(),
  role: z.string().min(1),
})

const ExtractionSchema = z.object({
  name: z.string(),
  about: z.string(),
  location: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  applicationDeadline: z.string().nullable(),
  applicationOpensDate: z.string().nullable(),
  deadlineStatus: z.enum([
    'dated',
    'rolling',
    'upcoming',
    'unclear',
  ]),
  gradeRangeLow: z.number().nullable(),
  gradeRangeHigh: z.number().nullable(),
  ageRangeLow: z.number().nullable(),
  ageRangeHigh: z.number().nullable(),
  fields: z.array(z.enum(FIELD_TAXONOMY)),
  eligibilityNotes: z.string().nullable(),
  cost: z.string(),
  financialAid: z.string(),
  stipend: z.string(),
  programType: z.enum(PROGRAM_TYPE_TAXONOMY),
  durationText: z.string(),
  residential: z.enum(RESIDENTIAL_OPTIONS),
  contactEmail: z.string().nullable(),
  applicationUrl: z.string(),
  reasoning: z.string(),
  consultedPages: z
    .array(ConsultationEntrySchema)
    .default([]),
})

// Sanitize and cap a persisted consultedPages list before pre-fetching
// it on the next run. Returns [] when the stored value is missing or
// malformed (e.g. legacy docs from before the field was added) so the
// caller can fall back to the multi-turn path instead of crashing.
function selectConsultedPages(docData, cap) {
  const raw = docData && docData.consultedPages
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const { url, role } = entry
    if (
      typeof url !== 'string' ||
      typeof role !== 'string'
    ) {
      continue
    }
    const parsed = ConsultationEntrySchema.safeParse({
      url,
      role,
    })
    if (!parsed.success) continue
    if (seen.has(parsed.data.url)) continue
    seen.add(parsed.data.url)
    out.push(parsed.data)
    if (out.length >= cap) break
  }
  return out
}

// Build the user-turn message for the single-turn extraction that
// starts from a pre-fetched consultedPages set. Each pre-fetched
// page is inlined with its role label so the model can verify
// existing fields without re-doing the link-discovery loop. The
// fetch_page tool is still available so the model can follow a new
// link if a field has moved or the pre-fetched text is incomplete.
function buildPrefetchPrompt(seedUrl, fetchedPages) {
  const blocks = (fetchedPages || []).map((p, i) => {
    const title = p.page && p.page.title ? p.page.title : ''
    const body =
      p.page && p.page.ok && p.page.bodyText
        ? p.page.bodyText
        : p.page && p.page.error
        ? `[fetch failed: ${p.page.error}]`
        : '[no body]'
    return [
      `--- Page ${i + 1} of ${fetchedPages.length} ---`,
      `URL: ${p.url}`,
      `Role (what the previous run used this page for): ${p.role}`,
      `Title: ${title}`,
      `Body:`,
      body,
    ].join('\n')
  })
  const pageSection =
    blocks.length > 0
      ? `\n\n${blocks.join('\n\n')}`
      : '\n\nNo prior pages were available; treat the seed URL as the only context you have.'
  return (
    `Extract structured information about this STEM opportunity. ` +
    `Seed URL: ${seedUrl}\n\n` +
    `Below are the pages a previous run consulted for this source, ` +
    `with the role each page played. Verify each field against the ` +
    `live text; if a field has moved, follow a new link with ` +
    `fetch_page. When you have everything (or have made a good-faith ` +
    `effort and still cannot find a clear answer), call ` +
    `submit_extraction with your final answer and list the URLs you ` +
    `actually used in consultedPages.` +
    pageSection
  )
}

module.exports = {
  ExtractionSchema,
  ConsultationEntrySchema,
  FIELD_TAXONOMY,
  PROGRAM_TYPE_TAXONOMY,
  RESIDENTIAL_OPTIONS,
  selectConsultedPages,
  buildPrefetchPrompt,
}
