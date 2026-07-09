// Client-side toxicity detection: Xenova/toxic-bert running fully in the
// browser via Transformers.js, off the main thread in
// lib/toxicityWorker.js. This replaces the old server-side Perspective
// API proxy (formerly pages/api/toxicity.js) — no round trip, no
// GM_API_KEY to guard. See components/Discussion.js for the caller and
// https://web.dev/articles/ai-detect-toxicity-build for the approach.
//
// This module holds only pure logic (constants, validation, scoring) so
// it can be unit-tested without loading the ~111MB model or touching
// Worker/self globals — see toxicity.test.js.

export const MODEL_NAME = 'Xenova/toxic-bert'

// Toxicity scores are 0..1. 0.9 catches overtly toxic comments while
// avoiding false positives on borderline language — web.dev's
// recommended default threshold.
export const TOXICITY_THRESHOLD = 0.9

// Matches the comment/reply Textarea's maxLength in Discussion.js;
// rejected before ever reaching the classifier.
export const MAX_TEXT_LEN = 1000

// Worker -> main thread message codes.
export const MESSAGE_CODE = {
  PREPARING_MODEL: 'preparing-model',
  MODEL_READY: 'model-ready',
  GENERATING_RESPONSE: 'generating-response',
  RESPONSE_READY: 'response-ready',
  MODEL_ERROR: 'model-error',
  INFERENCE_ERROR: 'inference-error',
}

// Returns { valid: true } or { valid: false, error }. Mirrors the checks
// the old server route ran before spending a Perspective API call — now
// run before ever posting to the worker.
export function validateCommentText(text) {
  if (
    typeof text !== 'string' ||
    text.trim().length === 0
  ) {
    return { valid: false, error: 'Missing text' }
  }
  if (text.length > MAX_TEXT_LEN) {
    return { valid: false, error: 'Text too long' }
  }
  return { valid: true }
}

// input:  [{ label: 'toxic', score: 0.92 }, { label: 'insult', score: 0.96 },
//   { label: 'obscene', score: 0.03 }, ...]
// output: ['toxic', 'insult']
export function getToxicityTypes(
  results,
  threshold = TOXICITY_THRESHOLD
) {
  if (!Array.isArray(results)) return []
  return results
    .filter(
      (result) =>
        result &&
        typeof result.score === 'number' &&
        result.score > threshold
    )
    .map((result) => result.label)
}

// Wraps getToxicityTypes into the shape posted back to the main thread /
// consumed by Discussion.js.
export function assessToxicity(
  results,
  threshold = TOXICITY_THRESHOLD
) {
  const toxicityTypes = getToxicityTypes(results, threshold)
  return {
    isToxic: toxicityTypes.length > 0,
    toxicityTypeList: toxicityTypes.join(', '),
  }
}
