// Exercises the actual storage.rules file against the Storage emulator
// (cross-referencing the Firestore emulator for project membership via
// `firestore.get()`, same as production). Run via `pnpm test:rules`
// (wraps this file in `firebase emulators:exec` so the emulator
// lifecycle is managed for us).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes,
} from 'firebase/storage'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIRESTORE_RULES_PATH = resolve(
  __dirname,
  '../../firestore.rules'
)
const STORAGE_RULES_PATH = resolve(
  __dirname,
  '../../storage.rules'
)

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-sciteens-test',
    firestore: {
      rules: readFileSync(FIRESTORE_RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(STORAGE_RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
})

function ctxStorage(uid) {
  return (
    uid
      ? testEnv.authenticatedContext(uid)
      : testEnv.unauthenticatedContext()
  ).storage()
}

// Bypasses rules to seed the project doc storage.rules' firestore.get()
// depends on — never used to assert behavior.
async function seedProject(projectId, member_uids) {
  await testEnv.withSecurityRulesDisabled(async (context) =>
    setDoc(
      doc(context.firestore(), 'projects', projectId),
      {
        member_uids,
      }
    )
  )
}

const PNG_BYTES = new Uint8Array([1, 2, 3, 4])
const OVER_THUMBNAIL_BUDGET_BYTES = new Uint8Array(300001)

const OVERSIZED_BYTES = new Uint8Array(8000001)

describe('/profiles/{uid}/{fileName=**}', () => {
  it('owner can upload an allowlisted, in-budget file', async () => {
    const storage = ctxStorage('alice')
    await assertSucceeds(
      uploadBytes(
        ref(storage, 'profiles/alice/f1.png'),
        PNG_BYTES,
        {
          contentType: 'image/png',
        }
      )
    )
  })

  it('rejects upload from a different uid', async () => {
    const storage = ctxStorage('mallory')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/f1.png'),
        PNG_BYTES,
        {
          contentType: 'image/png',
        }
      )
    )
  })

  it('rejects a disallowed content type', async () => {
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/f1.docx'),
        PNG_BYTES,
        {
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
      )
    )
  })

  it('rejects a file over the 8MB budget', async () => {
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/big.png'),
        OVERSIZED_BYTES,
        { contentType: 'image/png' }
      )
    )
  })

  it('is publicly readable', async () => {
    await testEnv.withSecurityRulesDisabled(
      async (context) =>
        uploadBytes(
          ref(context.storage(), 'profiles/alice/f1.png'),
          PNG_BYTES,
          { contentType: 'image/png' }
        )
    )
    const storage = ctxStorage(null)
    await assertSucceeds(
      getBytes(ref(storage, 'profiles/alice/f1.png'))
    )
  })

  it('only the owner can delete, and deletion needs no content-type/size', async () => {
    await testEnv.withSecurityRulesDisabled(
      async (context) =>
        uploadBytes(
          ref(context.storage(), 'profiles/alice/f1.png'),
          PNG_BYTES,
          { contentType: 'image/png' }
        )
    )
    await assertFails(
      deleteObject(
        ref(ctxStorage('mallory'), 'profiles/alice/f1.png')
      )
    )
    await assertSucceeds(
      deleteObject(
        ref(ctxStorage('alice'), 'profiles/alice/f1.png')
      )
    )
  })
})

describe('/profiles/{uid}/thumbnails/{fileName=**}', () => {
  it('owner can upload a small PNG thumbnail', async () => {
    const storage = ctxStorage('alice')
    await assertSucceeds(
      uploadBytes(
        ref(storage, 'profiles/alice/thumbnails/f1.png'),
        PNG_BYTES,
        { contentType: 'image/png' }
      )
    )
  })

  it('rejects a thumbnail over its (stricter than the general) size budget, even though it would pass the general upload rule', async () => {
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/thumbnails/big.png'),
        OVER_THUMBNAIL_BUDGET_BYTES,
        { contentType: 'image/png' }
      )
    )
  })

  it('rejects a non-PNG content type', async () => {
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/thumbnails/f1.jpg'),
        PNG_BYTES,
        { contentType: 'image/jpeg' }
      )
    )
  })

  it('rejects upload from a different uid', async () => {
    const storage = ctxStorage('mallory')
    await assertFails(
      uploadBytes(
        ref(storage, 'profiles/alice/thumbnails/f1.png'),
        PNG_BYTES,
        { contentType: 'image/png' }
      )
    )
  })
})

describe('/projects/{projectId}/{fileName=**}', () => {
  it('a member can upload an allowlisted, in-budget file', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('alice')
    await assertSucceeds(
      uploadBytes(
        ref(storage, 'projects/p1/f1.pdf'),
        PNG_BYTES,
        { contentType: 'application/pdf' }
      )
    )
  })

  it('rejects upload from a non-member', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('mallory')
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/p1/f1.pdf'),
        PNG_BYTES,
        { contentType: 'application/pdf' }
      )
    )
  })

  it('rejects a disallowed content type even from a member', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/p1/f1.ppt'),
        PNG_BYTES,
        {
          contentType: 'application/vnd.ms-powerpoint',
        }
      )
    )
  })

  it('rejects a file over the 8MB budget', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/p1/big.pdf'),
        OVERSIZED_BYTES,
        { contentType: 'application/pdf' }
      )
    )
  })

  it('only a member can delete', async () => {
    await seedProject('p1', ['alice'])
    await testEnv.withSecurityRulesDisabled(
      async (context) =>
        uploadBytes(
          ref(context.storage(), 'projects/p1/f1.pdf'),
          PNG_BYTES,
          { contentType: 'application/pdf' }
        )
    )
    await assertFails(
      deleteObject(
        ref(ctxStorage('mallory'), 'projects/p1/f1.pdf')
      )
    )
    await assertSucceeds(
      deleteObject(
        ref(ctxStorage('alice'), 'projects/p1/f1.pdf')
      )
    )
  })
})

describe('/projects/{projectId}/thumbnails/{fileName=**}', () => {
  it('a member can upload a small PNG thumbnail', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('alice')
    await assertSucceeds(
      uploadBytes(
        ref(storage, 'projects/p1/thumbnails/f1.png'),
        PNG_BYTES,
        { contentType: 'image/png' }
      )
    )
  })

  it('rejects a thumbnail over its (stricter than the general) size budget, even though it would pass the general upload rule', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('alice')
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/p1/thumbnails/big.png'),
        OVER_THUMBNAIL_BUDGET_BYTES,
        { contentType: 'image/png' }
      )
    )
  })

  it('rejects upload from a non-member', async () => {
    await seedProject('p1', ['alice'])
    const storage = ctxStorage('mallory')
    await assertFails(
      uploadBytes(
        ref(storage, 'projects/p1/thumbnails/f1.png'),
        PNG_BYTES,
        { contentType: 'image/png' }
      )
    )
  })
})

describe('/courses/{slug}/{fileName=**}', () => {
  it('is publicly readable but never client-writable', async () => {
    await testEnv.withSecurityRulesDisabled(
      async (context) =>
        uploadBytes(
          ref(context.storage(), 'courses/bio/f1.png'),
          PNG_BYTES,
          { contentType: 'image/png' }
        )
    )
    await assertSucceeds(
      getBytes(ref(ctxStorage(null), 'courses/bio/f1.png'))
    )
    await assertFails(
      uploadBytes(
        ref(ctxStorage('alice'), 'courses/bio/f1.png'),
        PNG_BYTES,
        { contentType: 'image/png' }
      )
    )
  })
})

describe('catch-all deny', () => {
  it('denies read and write on an undeclared prefix', async () => {
    const storage = ctxStorage('alice')
    await assertFails(
      getBytes(ref(storage, 'random/f1.png'))
    )
    await assertFails(
      uploadBytes(
        ref(storage, 'random/f1.png'),
        PNG_BYTES,
        {
          contentType: 'image/png',
        }
      )
    )
  })
})
