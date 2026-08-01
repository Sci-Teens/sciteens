import { describe, expect, it } from 'vitest'
const admin = require('firebase-admin')

// functions/index.js reaches for the legacy namespaced Admin SDK
// surface (admin.firestore(), admin.auth(), admin.storage(),
// admin.firestore.FieldValue) in dozens of places. firebase-admin v14
// removed all of it, and nothing else catches that: module load and
// `firebase deploy` trigger discovery never touch these, so a bad
// major lands as a runtime outage on the first invocation instead.
describe('firebase-admin namespaced surface', () => {
  it.each(['firestore', 'auth', 'storage'])(
    'admin.%s is callable',
    (name) => {
      expect(typeof admin[name]).toBe('function')
    }
  )

  it('exposes FieldValue helpers off admin.firestore', () => {
    expect(
      typeof admin.firestore.FieldValue.arrayUnion
    ).toBe('function')
    expect(typeof admin.firestore.FieldValue.delete).toBe(
      'function'
    )
  })
})

describe('runtime prerequisites', () => {
  it('provides the globals slackPost relies on', () => {
    expect(typeof fetch).toBe('function')
    expect(typeof AbortSignal.timeout).toBe('function')
  })
})
