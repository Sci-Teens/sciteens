#!/usr/bin/env node
// pdfjs-dist ships as ESM-only (build/pdf.worker.min.mjs), and this
// repo's webpack config runs with esmExternals: false — that combo
// makes webpack refuse to resolve a bare `new URL('pdfjs-dist/...',
// import.meta.url)` worker reference at build time. Copying the worker
// into public/ once before build/dev sidesteps webpack entirely:
// components/PdfThumbnail.js just points at the plain static path
// '/pdf.worker.min.mjs'.
const fs = require('node:fs')
const path = require('node:path')

const source = require.resolve(
  'pdfjs-dist/build/pdf.worker.min.mjs'
)
const dest = path.join(
  __dirname,
  '..',
  'public',
  'pdf.worker.min.mjs'
)

fs.copyFileSync(source, dest)
console.log(`Copied ${source} -> ${dest}`)
