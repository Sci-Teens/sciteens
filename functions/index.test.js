import { afterEach, describe, expect, it, vi } from 'vitest'
const admin = require('firebase-admin')
const vision = require('@google-cloud/vision')
const {
  acceptProjectInvite,
  fileUpload,
  newUser,
  newsletter,
  newDiscussion,
} = require('./index')

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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fileUpload moderation', () => {
  it('scans and deletes unsafe uploads with forged optimized metadata', async () => {
    const safeSearchDetection = vi
      .spyOn(
        vision.ImageAnnotatorClient.prototype,
        'safeSearchDetection'
      )
      .mockResolvedValue([
        {
          safeSearchAnnotation: {
            adult: 'LIKELY',
            spoof: 'VERY_UNLIKELY',
            violence: 'VERY_UNLIKELY',
            racy: 'VERY_UNLIKELY',
          },
        },
      ])
    const deleteObject = vi.fn().mockResolvedValue()
    vi.spyOn(admin, 'storage').mockReturnValue({
      bucket: () => ({
        file: () => ({ delete: deleteObject }),
      }),
    })

    await fileUpload.run({
      bucket: 'bucket',
      name: 'profiles/alice/forged.png',
      contentType: 'image/png',
      metadata: { optimized: 'true' },
    })

    expect(safeSearchDetection).toHaveBeenCalledWith(
      'gs://bucket/profiles/alice/forged.png'
    )
    expect(deleteObject).toHaveBeenCalledOnce()
  })
})

describe('acceptProjectInvite', () => {
  it('rejects an unverified Firebase email identity', async () => {
    vi.spyOn(admin, 'auth').mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'mallory',
        email: 'victim@example.com',
        email_verified: false,
      }),
    })
    const response = { statusCode: 0, body: null }
    const res = {
      set: vi.fn(),
      status: vi.fn((statusCode) => {
        response.statusCode = statusCode
        return res
      }),
      json: vi.fn((body) => {
        response.body = body
        return res
      }),
    }
    const req = {
      method: 'POST',
      body: {
        token: `${'a'.repeat(64)}.${'b'.repeat(32)}`,
      },
      get: vi.fn((name) =>
        name === 'Authorization' ? 'Bearer id-token' : ''
      ),
    }

    await acceptProjectInvite(req, res)

    expect(response).toEqual({
      statusCode: 401,
      body: { ok: false, error: 'invalid_identity' },
    })
  })

  it('allows the authorization header in browser preflight', async () => {
    const headers = new Map()
    const res = {
      set: vi.fn((name, value) => headers.set(name, value)),
      status: vi.fn(() => res),
      send: vi.fn(() => res),
    }
    const req = {
      method: 'OPTIONS',
      get: vi.fn((name) =>
        name === 'Origin' ? 'https://sciteens.org' : ''
      ),
    }

    await acceptProjectInvite(req, res)

    expect(
      headers.get('Access-Control-Allow-Headers')
    ).toBe('Authorization, Content-Type')
    expect(res.status).toHaveBeenCalledWith(204)
  })
})

describe('newUser delivery claim', () => {
  it('keeps required writes and retries while a delivery lease is active', async () => {
    const emailWrite = vi.fn().mockResolvedValue()
    const claimRef = { update: vi.fn() }
    const firestore = vi.fn(() => ({
      collection: vi.fn((name) => ({
        doc: vi.fn(() =>
          name === 'signup-email-deliveries'
            ? claimRef
            : { set: emailWrite }
        ),
      })),
      runTransaction: vi.fn(async (callback) =>
        callback({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              uid: 'same-user',
              completed: false,
              windowStartedAt: Date.now(),
              leaseUntil: Date.now() + 60_000,
            }),
          }),
        })
      ),
    }))
    Object.assign(firestore, {
      FieldValue: admin.firestore.FieldValue,
    })
    vi.spyOn(admin, 'firestore').mockImplementation(
      firestore
    )

    await expect(
      newUser.run({
        uid: 'same-user',
        email: 'student@example.com',
      })
    ).rejects.toThrow(
      'Signup email delivery is in progress.'
    )
    expect(emailWrite).toHaveBeenCalledOnce()
  })
})

describe('discussion recipient quota', () => {
  it('blocks email after the recipient reaches the shared limit', async () => {
    const rateDoc = vi.fn((id) => ({ id }))
    const transactionSet = vi.fn()
    const firestore = vi.fn(() => ({
      collection: vi.fn((name) => {
        if (name === 'projects') {
          return {
            doc: vi.fn(() => ({
              get: vi
                .fn()
                .mockResolvedValue({ exists: true }),
            })),
          }
        }
        return { doc: rateDoc }
      }),
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ uid: 'recipient-user' }),
        }),
      })),
      runTransaction: vi.fn(async (callback) =>
        callback({
          get: vi.fn(async (ref) => ({
            exists: true,
            data: () => ({
              windowStartedAt: Date.now(),
              count: ref.id.startsWith('recipient-')
                ? 5
                : 0,
            }),
          })),
          set: transactionSet,
        })
      ),
    }))
    Object.assign(firestore, {
      FieldValue: admin.firestore.FieldValue,
    })
    vi.spyOn(admin, 'firestore').mockImplementation(
      firestore
    )
    const auth = vi.spyOn(admin, 'auth')

    await newDiscussion.run(
      {
        data: () => ({
          uid: 'sender-user',
          reply_to_id: 'validReply123',
        }),
      },
      { params: { projectID: 'project-1' } }
    )

    expect(transactionSet).not.toHaveBeenCalled()
    expect(auth).not.toHaveBeenCalled()
    expect(rateDoc).toHaveBeenCalledTimes(2)
  })
})

describe('newsletter request ceiling', () => {
  it('stops before allocating an email bucket when the global limit is full', async () => {
    const doc = vi.fn((id) => ({ id }))
    const runTransaction = vi.fn(async (callback) =>
      callback({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            windowStartedAt: Date.now(),
            count: 100,
          }),
        }),
      })
    )
    const firestore = vi.fn(() => ({
      collection: vi.fn(() => ({ doc })),
      runTransaction,
    }))
    Object.assign(firestore, {
      FieldValue: admin.firestore.FieldValue,
    })
    vi.spyOn(admin, 'firestore').mockImplementation(
      firestore
    )
    const response = { statusCode: 0, body: null }
    const res = {
      set: vi.fn(),
      status: vi.fn((statusCode) => {
        response.statusCode = statusCode
        return res
      }),
      json: vi.fn((body) => {
        response.body = body
        return res
      }),
    }
    const req = {
      method: 'POST',
      body: { email: 'student@example.com', website: '' },
      query: {},
      get: vi.fn(() => ''),
    }

    await newsletter(req, res)

    expect(response).toEqual({
      statusCode: 429,
      body: { ok: false, error: 'rate_limited' },
    })
    expect(doc).toHaveBeenCalledOnce()
    expect(doc).toHaveBeenCalledWith('global-signup')
  })
})

describe('runtime prerequisites', () => {
  it('provides the globals slackPost relies on', () => {
    expect(typeof fetch).toBe('function')
    expect(typeof AbortSignal.timeout).toBe('function')
  })
})
