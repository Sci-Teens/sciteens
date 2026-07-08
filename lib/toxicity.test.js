import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MAX_TEXT_LEN,
  MODEL_NAME,
  TOXICITY_THRESHOLD,
  assessToxicity,
  getToxicityTypes,
  validateCommentText,
} from './toxicity'

// This file covers TESTING.md's Priority 2 ("API route tests") intent for
// the former pages/api/toxicity.js Perspective proxy, adapted to the
// client-side Xenova/toxic-bert classifier (Transformers.js, running in
// lib/toxicityWorker.js) that replaced it — see
// https://web.dev/articles/ai-detect-toxicity-build.
//
// Several original Priority 2 bullets no longer apply because there is no
// longer an HTTP route at all: method/origin checks, per-IP rate
// limiting, and "missing GM_API_KEY -> 500" all belonged to the deleted
// server proxy. There is nothing left to fail open a request or leak a
// secret with — classification runs entirely in the user's own browser,
// off a public model name, with no server secret in the loop. What
// carries over 1:1 is the input validation ("missing/empty text -> 400",
// "text over MAX_TEXT_LEN -> 400") and — more importantly, since it's the
// actual detection logic that used to live behind the proxy — the
// threshold-based toxicity scoring itself.

describe('validateCommentText', () => {
  it('rejects a missing/non-string value', () => {
    expect(validateCommentText(undefined)).toEqual({
      valid: false,
      error: 'Missing text',
    })
    expect(validateCommentText(null)).toEqual({
      valid: false,
      error: 'Missing text',
    })
    expect(validateCommentText(42)).toEqual({
      valid: false,
      error: 'Missing text',
    })
  })

  it('rejects an empty or whitespace-only string', () => {
    expect(validateCommentText('')).toEqual({
      valid: false,
      error: 'Missing text',
    })
    expect(validateCommentText('   \n\t ')).toEqual({
      valid: false,
      error: 'Missing text',
    })
  })

  it('rejects text over MAX_TEXT_LEN', () => {
    const tooLong = 'a'.repeat(MAX_TEXT_LEN + 1)
    expect(validateCommentText(tooLong)).toEqual({
      valid: false,
      error: 'Text too long',
    })
  })

  it('accepts text exactly at MAX_TEXT_LEN (boundary)', () => {
    const atLimit = 'a'.repeat(MAX_TEXT_LEN)
    expect(validateCommentText(atLimit)).toEqual({
      valid: true,
    })
  })

  it('accepts ordinary comment text', () => {
    expect(
      validateCommentText('This is a great project!')
    ).toEqual({ valid: true })
  })
})

describe('getToxicityTypes', () => {
  it('returns labels whose score is strictly above the threshold', () => {
    const results = [
      { label: 'toxic', score: 0.92 },
      { label: 'insult', score: 0.96 },
      { label: 'obscene', score: 0.03 },
      { label: 'threat', score: 0.01 },
    ]
    expect(getToxicityTypes(results)).toEqual([
      'toxic',
      'insult',
    ])
  })

  it('excludes a score exactly equal to the threshold (boundary)', () => {
    const results = [
      { label: 'toxic', score: TOXICITY_THRESHOLD },
    ]
    expect(getToxicityTypes(results)).toEqual([])
  })

  it('returns [] when nothing crosses the threshold', () => {
    const results = [
      { label: 'toxic', score: 0.1 },
      { label: 'insult', score: 0.2 },
    ]
    expect(getToxicityTypes(results)).toEqual([])
  })

  it('returns [] for empty or malformed input instead of throwing', () => {
    expect(getToxicityTypes([])).toEqual([])
    expect(getToxicityTypes(null)).toEqual([])
    expect(getToxicityTypes(undefined)).toEqual([])
    expect(getToxicityTypes('not an array')).toEqual([])
  })

  it('honors a custom threshold override', () => {
    const results = [{ label: 'toxic', score: 0.5 }]
    expect(getToxicityTypes(results, 0.4)).toEqual([
      'toxic',
    ])
    expect(getToxicityTypes(results, 0.6)).toEqual([])
  })
})

describe('assessToxicity', () => {
  it('flags isToxic and lists every label over threshold, in order', () => {
    const results = [
      { label: 'toxic', score: 0.92 },
      { label: 'severe_toxic', score: 0.12 },
      { label: 'obscene', score: 0.03 },
      { label: 'threat', score: 0.01 },
      { label: 'insult', score: 0.96 },
      { label: 'identity_hate', score: 0.02 },
    ]
    expect(assessToxicity(results)).toEqual({
      isToxic: true,
      toxicityTypeList: 'toxic, insult',
    })
  })

  it('reports isToxic false with an empty type list for benign text', () => {
    const results = [
      { label: 'toxic', score: 0.01 },
      { label: 'severe_toxic', score: 0.0 },
      { label: 'obscene', score: 0.02 },
      { label: 'threat', score: 0.0 },
      { label: 'insult', score: 0.01 },
      { label: 'identity_hate', score: 0.0 },
    ]
    expect(assessToxicity(results)).toEqual({
      isToxic: false,
      toxicityTypeList: '',
    })
  })
})

describe('module shape / secret hygiene', () => {
  // The old pages/api/toxicity.js proxy existed specifically to keep
  // GM_API_KEY server-only (AGENTS.md). The replacement classifier has no
  // server secret at all — MODEL_NAME is a public Hugging Face model id,
  // not a credential — so there's nothing left to leak. This locks that
  // invariant in: nobody should reintroduce a process.env-gated secret
  // into what is meant to be a pure, client-safe module.
  it('never references a server environment/secret', () => {
    const source = readFileSync(
      new URL('./toxicity.js', import.meta.url),
      'utf8'
    )
    expect(source).not.toMatch(/process\.env/)
  })

  it('exposes a public model name and a numeric threshold', () => {
    expect(MODEL_NAME).toBe('Xenova/toxic-bert')
    expect(TOXICITY_THRESHOLD).toBeGreaterThan(0)
    expect(TOXICITY_THRESHOLD).toBeLessThanOrEqual(1)
  })
})
