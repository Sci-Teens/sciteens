// Exercises the actual firestore.rules file against the Firestore
// emulator (AGENTS.md: "Owner-scoped writes only"), one `describe` per
// collection. Run via `pnpm test:rules` (wraps this file in
// `firebase emulators:exec` so the emulator lifecycle is managed for us).
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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RULES_PATH = resolve(
  __dirname,
  '../../firestore.rules'
)

let testEnv

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-sciteens-test',
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

function ctxFirestore(uid) {
  return (
    uid
      ? testEnv.authenticatedContext(uid)
      : testEnv.unauthenticatedContext()
  ).firestore()
}

// Bypasses rules to seed fixtures — never used to assert behavior.
async function seed(setupFn) {
  await testEnv.withSecurityRulesDisabled(async (context) =>
    setupFn(context.firestore())
  )
}

describe('/profiles/{uid}', () => {
  it('owner can create with matching uid field', async () => {
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'profiles/alice'), {
        uid: 'alice',
        name: 'Alice',
      })
    )
  })

  it('rejects create when resource.data.uid does not match auth.uid', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      setDoc(doc(db, 'profiles/alice'), {
        uid: 'mallory',
        name: 'Alice',
      })
    )
  })

  it("non-owner cannot create another user's profile", async () => {
    const db = ctxFirestore('mallory')
    await assertFails(
      setDoc(doc(db, 'profiles/alice'), {
        uid: 'alice',
        name: 'Mallory',
      })
    )
  })

  it('owner can update and delete their own profile', async () => {
    await seed((db) =>
      setDoc(doc(db, 'profiles/alice'), {
        uid: 'alice',
        name: 'Alice',
      })
    )
    const db = ctxFirestore('alice')
    await assertSucceeds(
      updateDoc(doc(db, 'profiles/alice'), {
        name: 'Alice B',
      })
    )
    await assertSucceeds(
      deleteDoc(doc(db, 'profiles/alice'))
    )
  })

  it('non-owner cannot update or delete', async () => {
    await seed((db) =>
      setDoc(doc(db, 'profiles/alice'), {
        uid: 'alice',
        name: 'Alice',
      })
    )
    const db = ctxFirestore('mallory')
    await assertFails(
      updateDoc(doc(db, 'profiles/alice'), {
        name: 'Pwned',
      })
    )
    await assertFails(deleteDoc(doc(db, 'profiles/alice')))
  })

  it('is publicly readable, including unauthenticated', async () => {
    await seed((db) =>
      setDoc(doc(db, 'profiles/alice'), { uid: 'alice' })
    )
    const db = ctxFirestore(null)
    await assertSucceeds(getDoc(doc(db, 'profiles/alice')))
  })
})

describe('/emails/{uid}', () => {
  it('owner can create their own email row', async () => {
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'emails/alice'), {
        email: 'alice@example.com',
      })
    )
  })

  it('rejects create for a uid other than the caller', async () => {
    const db = ctxFirestore('mallory')
    await assertFails(
      setDoc(doc(db, 'emails/alice'), {
        email: 'mallory@evil.com',
      })
    )
  })

  it('rejects create when email is not a string', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      setDoc(doc(db, 'emails/alice'), { email: 12345 })
    )
  })

  it('no client, including the owner, can read a single doc', async () => {
    await seed((db) =>
      setDoc(doc(db, 'emails/alice'), {
        email: 'alice@example.com',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(getDoc(doc(db, 'emails/alice')))
  })

  // Reproduces the pre-fix bug: pages/project/create.js and
  // pages/project/[id]/edit.js used to query the `emails` collection
  // client-side for member-invite lookup, which the rules reject by
  // construction.
  it('no client can query/list the collection', async () => {
    await seed((db) =>
      setDoc(doc(db, 'emails/alice'), {
        email: 'alice@example.com',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(
      getDocs(
        query(
          collection(db, 'emails'),
          where('email', '==', 'alice@example.com')
        )
      )
    )
  })

  it('update and delete are always rejected, even for the owner', async () => {
    await seed((db) =>
      setDoc(doc(db, 'emails/alice'), {
        email: 'alice@example.com',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(
      updateDoc(doc(db, 'emails/alice'), {
        email: 'new@example.com',
      })
    )
    await assertFails(deleteDoc(doc(db, 'emails/alice')))
  })
})

describe('/projects/{projectId}', () => {
  it('creator can create with themselves as member_uids[0]', async () => {
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
        title: 'x',
      })
    )
  })

  it('rejects create when member_uids[0] is not the creator', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['mallory'],
        title: 'x',
      })
    )
  })

  it('rejects create with an empty member_uids', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      setDoc(doc(db, 'projects/p1'), {
        member_uids: [],
        title: 'x',
      })
    )
  })

  it('a member can update non-membership fields', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
        title: 'x',
      })
    )
    const db = ctxFirestore('alice')
    await assertSucceeds(
      updateDoc(doc(db, 'projects/p1'), { title: 'y' })
    )
  })

  it('a non-member cannot update', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
        title: 'x',
      })
    )
    const db = ctxFirestore('mallory')
    await assertFails(
      updateDoc(doc(db, 'projects/p1'), {
        title: 'pwned',
      })
    )
  })

  it('a member cannot mutate member_uids via update (mass-assignment guard)', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
        title: 'x',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(
      updateDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice', 'mallory'],
      })
    )
  })

  it('a member cannot mutate subscribers via update', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
        subscribers: [],
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(
      updateDoc(doc(db, 'projects/p1'), {
        subscribers: ['mallory'],
      })
    )
  })

  it('only a member can delete', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
      })
    )
    await assertFails(
      deleteDoc(doc(ctxFirestore('mallory'), 'projects/p1'))
    )
    await assertSucceeds(
      deleteDoc(doc(ctxFirestore('alice'), 'projects/p1'))
    )
  })

  it('is publicly readable', async () => {
    await seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
      })
    )
    await assertSucceeds(
      getDoc(doc(ctxFirestore(null), 'projects/p1'))
    )
  })
})

describe('/projects/{id}/discussion/{feedbackId}', () => {
  const seedProject = () =>
    seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
      })
    )

  it('create requires uid == auth.uid plus all required fields', async () => {
    await seedProject()
    const db = ctxFirestore('bob')
    await assertSucceeds(
      setDoc(doc(db, 'projects/p1/discussion/c1'), {
        date: Date.now(),
        uid: 'bob',
        display: 'Bob',
        comment: 'hi',
      })
    )
  })

  it('rejects create when uid does not match auth.uid', async () => {
    await seedProject()
    const db = ctxFirestore('bob')
    await assertFails(
      setDoc(doc(db, 'projects/p1/discussion/c1'), {
        date: Date.now(),
        uid: 'mallory',
        display: 'Bob',
        comment: 'hi',
      })
    )
  })

  it('rejects create missing required fields', async () => {
    await seedProject()
    const db = ctxFirestore('bob')
    await assertFails(
      setDoc(doc(db, 'projects/p1/discussion/c1'), {
        uid: 'bob',
      })
    )
  })

  it('only the comment author can update or delete it', async () => {
    await seedProject()
    await seed((db) =>
      setDoc(doc(db, 'projects/p1/discussion/c1'), {
        date: Date.now(),
        uid: 'bob',
        display: 'Bob',
        comment: 'hi',
      })
    )
    await assertFails(
      updateDoc(
        doc(
          ctxFirestore('mallory'),
          'projects/p1/discussion/c1'
        ),
        { comment: 'pwned' }
      )
    )
    await assertSucceeds(
      updateDoc(
        doc(
          ctxFirestore('bob'),
          'projects/p1/discussion/c1'
        ),
        { comment: 'edited' }
      )
    )
    await assertFails(
      deleteDoc(
        doc(
          ctxFirestore('mallory'),
          'projects/p1/discussion/c1'
        )
      )
    )
    await assertSucceeds(
      deleteDoc(
        doc(
          ctxFirestore('bob'),
          'projects/p1/discussion/c1'
        )
      )
    )
  })
})

describe('/project-invites/{projectId}', () => {
  const seedProject = () =>
    seed((db) =>
      setDoc(doc(db, 'projects/p1'), {
        member_uids: ['alice'],
      })
    )

  it('a project member can create/update/delete an invite doc', async () => {
    await seedProject()
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'project-invites/p1'), {
        email: 'x@y.com',
      })
    )
    await assertSucceeds(
      updateDoc(doc(db, 'project-invites/p1'), {
        email: 'z@y.com',
      })
    )
    await assertSucceeds(
      deleteDoc(doc(db, 'project-invites/p1'))
    )
  })

  it('a non-member cannot write an invite doc', async () => {
    await seedProject()
    const db = ctxFirestore('mallory')
    await assertFails(
      setDoc(doc(db, 'project-invites/p1'), {
        email: 'x@y.com',
      })
    )
  })

  it('rejects writes when the referenced project does not exist', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      setDoc(doc(db, 'project-invites/does-not-exist'), {
        email: 'x@y.com',
      })
    )
  })

  it('no client can read invite docs', async () => {
    await seedProject()
    await seed((db) =>
      setDoc(doc(db, 'project-invites/p1'), {
        email: 'x@y.com',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(getDoc(doc(db, 'project-invites/p1')))
  })
})

// programs / programs-minified / courses / statistics are all
// server-managed (see AGENTS.md's enforcement comment): public read,
// but every client write is denied outright regardless of auth.
describe.each([
  ['programs', 'p1'],
  ['programs-minified', 'p1'],
  ['courses', 'c1'],
  ['statistics', 's1'],
])('/%s/{id} is server-managed', (collectionName, id) => {
  it('is publicly readable but rejects any client write', async () => {
    await seed((db) =>
      setDoc(doc(db, `${collectionName}/${id}`), {
        seeded: true,
      })
    )
    const db = ctxFirestore('alice')
    await assertSucceeds(
      getDoc(doc(db, `${collectionName}/${id}`))
    )
    await assertFails(
      setDoc(doc(db, `${collectionName}/${id}`), {
        hacked: true,
      })
    )
    await assertFails(
      deleteDoc(doc(db, `${collectionName}/${id}`))
    )
  })
})

describe('/profile-slugs/{slug}', () => {
  it('any authenticated user can create a slug row', async () => {
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'profile-slugs/alice-cool'), {
        slug: 'alice-cool',
      })
    )
  })

  it('rejects create when unauthenticated', async () => {
    const db = ctxFirestore(null)
    await assertFails(
      setDoc(doc(db, 'profile-slugs/alice-cool'), {
        slug: 'alice-cool',
      })
    )
  })

  it('update and delete are always rejected, even for the creator', async () => {
    await seed((db) =>
      setDoc(doc(db, 'profile-slugs/alice-cool'), {
        slug: 'alice-cool',
      })
    )
    const db = ctxFirestore('alice')
    await assertFails(
      updateDoc(doc(db, 'profile-slugs/alice-cool'), {
        slug: 'renamed',
      })
    )
    await assertFails(
      deleteDoc(doc(db, 'profile-slugs/alice-cool'))
    )
  })
})

describe('/profile-pictures/{uid}', () => {
  it('owner can create/update/delete their own picture doc', async () => {
    const db = ctxFirestore('alice')
    await assertSucceeds(
      setDoc(doc(db, 'profile-pictures/alice'), {
        picture: 'https://x',
      })
    )
    await assertSucceeds(
      updateDoc(doc(db, 'profile-pictures/alice'), {
        picture: 'https://y',
      })
    )
    await assertSucceeds(
      deleteDoc(doc(db, 'profile-pictures/alice'))
    )
  })

  it("a non-owner cannot write another user's picture doc", async () => {
    const db = ctxFirestore('mallory')
    await assertFails(
      setDoc(doc(db, 'profile-pictures/alice'), {
        picture: 'https://evil',
      })
    )
  })
})

describe('catch-all deny', () => {
  it('denies read and write on an undeclared collection', async () => {
    const db = ctxFirestore('alice')
    await assertFails(
      getDoc(doc(db, 'not-a-real-collection/x'))
    )
    await assertFails(
      setDoc(doc(db, 'not-a-real-collection/x'), { a: 1 })
    )
  })
})
