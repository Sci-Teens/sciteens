// Web Worker: loads Xenova/toxic-bert with Transformers.js and classifies
// comments off the main thread, so typing never blocks on model
// download/inference. Instantiated by components/Discussion.js via
// `new Worker(new URL('../lib/toxicityWorker.js', import.meta.url), { type: 'module' })`.
//
// @huggingface/transformers is loaded at runtime from jsDelivr instead of
// being a bundled dependency: its onnxruntime-web backend ships
// pre-minified .mjs chunks that use `import.meta` at the top level, which
// Next's webpack/SWC build cannot parse once statically bundled into a
// Worker chunk ("import.meta cannot be used outside of module code" —
// the same class of failure other Next.js users hit, see
// https://github.com/huggingface/transformers.js/issues/984 and
// https://github.com/huggingface/transformers.js/issues/911). The
// `webpackIgnore` comment tells webpack to leave this import() alone; the
// browser resolves and executes it natively instead, sidestepping the
// bundler entirely. The version is pinned so a jsDelivr release never
// silently changes what ships to users — bump it deliberately alongside
// package.json's devDependency on the same package if it's ever upgraded.
//
// See lib/toxicity.js for the shared constants/pure logic, and
// https://web.dev/articles/ai-detect-toxicity-build for the approach.
import {
  MESSAGE_CODE,
  MODEL_NAME,
  assessToxicity,
  validateCommentText,
} from './toxicity'

const TRANSFORMERS_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm'

let transformersPromise = null

function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import(
      /* webpackIgnore: true */ TRANSFORMERS_CDN_URL
    )
      .then((mod) => {
        // Never fall back to a local model lookup in the browser.
        mod.env.allowLocalModels = false
        return mod
      })
      .catch((error) => {
        // Reset so a later comment can retry the CDN fetch instead of
        // replaying the same rejected promise forever.
        transformersPromise = null
        throw error
      })
  }
  return transformersPromise
}

// Lazily construct the pipeline on first use, so a page merely rendering
// Discussion never pays the model download cost — only typing a comment
// does. Cached for the lifetime of the worker afterwards.
let classifierPromise = null

function getClassifier() {
  if (!classifierPromise) {
    self.postMessage({
      code: MESSAGE_CODE.PREPARING_MODEL,
      payload: null,
    })
    // Force the WASM backend — WebGPU adds support-matrix complexity
    // this small a model doesn't need; toxic-bert already classifies in
    // well under a second on WASM per web.dev's benchmark.
    classifierPromise = loadTransformers()
      .then(({ pipeline }) =>
        pipeline('text-classification', MODEL_NAME, {
          device: 'wasm',
        })
      )
      .then((classifier) => {
        self.postMessage({
          code: MESSAGE_CODE.MODEL_READY,
          payload: null,
        })
        return classifier
      })
      .catch((error) => {
        self.postMessage({
          code: MESSAGE_CODE.MODEL_ERROR,
          payload: null,
        })
        // Reset so a later comment can retry model preparation instead
        // of replaying the same rejected promise forever.
        classifierPromise = null
        throw error
      })
  }
  return classifierPromise
}

self.onmessage = async function (event) {
  const text = event.data

  const validation = validateCommentText(text)
  if (!validation.valid) {
    self.postMessage({
      code: MESSAGE_CODE.INFERENCE_ERROR,
      payload: validation.error,
    })
    return
  }

  self.postMessage({
    code: MESSAGE_CODE.GENERATING_RESPONSE,
    payload: null,
  })

  try {
    const classifier = await getClassifier()
    const results = await classifier(text, { topk: null })
    self.postMessage({
      code: MESSAGE_CODE.RESPONSE_READY,
      payload: assessToxicity(results),
    })
  } catch (error) {
    console.error(
      '[toxicityWorker] inference error:',
      error
    )
    self.postMessage({
      code: MESSAGE_CODE.INFERENCE_ERROR,
      payload: null,
    })
  }
}
