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

module.exports = {
  ExtractionSchema,
  ConsultationEntrySchema,
  FIELD_TAXONOMY,
  PROGRAM_TYPE_TAXONOMY,
  RESIDENTIAL_OPTIONS,
}
