// Admin-SDK helpers for the Firestore/Auth emulators, bypassing rules
// — never point this at a real project.
const admin = require('firebase-admin')
const {
  EMULATOR_PROJECT_ID,
  FIRESTORE_EMULATOR_HOST,
  AUTH_EMULATOR_URL,
} = require('./env')

process.env.FIRESTORE_EMULATOR_HOST =
  FIRESTORE_EMULATOR_HOST
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  AUTH_EMULATOR_URL.replace(/^https?:\/\//, '')

let app
function adminApp() {
  if (!app) {
    app =
      admin.apps.find((a) => a.name === '[e2e]') ||
      admin.initializeApp(
        { projectId: EMULATOR_PROJECT_ID },
        '[e2e]'
      )
  }
  return app
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

// Mirrors pages/signup/student.js's writes, for tests that just need
// a signed-in user without driving the signup UI.
async function seedStudent({
  firstName = 'Invitee',
  lastName = 'Student',
  email,
  password = 'Sup3rSecret!23',
} = {}) {
  const suffix = uniqueSuffix()
  const resolvedEmail = email || `${suffix}@example.com`
  const auth = adminApp().auth()
  const firestore = adminApp().firestore()

  const userRecord = await auth.createUser({
    email: resolvedEmail,
    password,
    displayName: `${firstName} ${lastName}`,
  })

  const slug = `${firstName}-${lastName}-${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

  await firestore
    .collection('profiles')
    .doc(userRecord.uid)
    .set({
      uid: userRecord.uid,
      display: `${firstName} ${lastName}`,
      authorized: true,
      slug,
      about: '',
      fields: [],
      programs: [],
      links: [],
      joined: new Date().toISOString(),
      birthday: new Date(
        Date.now() - 16 * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      institution: '',
      position: '',
      race: 'Prefer not to answer',
      gender: 'Prefer not to answer',
      subs_p: [],
      subs_e: [],
      mentor: false,
    })
  await firestore
    .collection('profile-slugs')
    .doc(slug)
    .set({ slug })
  await firestore
    .collection('emails')
    .doc(userRecord.uid)
    .set({ email: resolvedEmail })

  return {
    uid: userRecord.uid,
    email: resolvedEmail,
    password,
    displayName: `${firstName} ${lastName}`,
    slug,
  }
}

// Direct `projects` write bypassing client rules, for planting
// fixtures the app can no longer produce (e.g. legacy lowercase
// `fields`).
async function seedProject(data) {
  const firestore = adminApp().firestore()
  const ref = await firestore.collection('projects').add({
    date: new Date().toISOString(),
    start: new Date().toISOString(),
    end: '',
    need_mentor: false,
    links: [],
    subscribers: [],
    member_arr: [],
    member_uids: [],
    ...data,
  })
  return ref.id
}

async function getProject(projectId) {
  const snap = await adminApp()
    .firestore()
    .collection('projects')
    .doc(projectId)
    .get()
  return snap.exists ? snap.data() : null
}

async function setProjectFields(projectId, fields) {
  await adminApp()
    .firestore()
    .collection('projects')
    .doc(projectId)
    .update({ fields })
}

// project-invites is `read: if false` in firestore.rules, so only the
// admin SDK can verify it.
async function getProjectInvite(projectId) {
  const snap = await adminApp()
    .firestore()
    .collection('project-invites')
    .doc(projectId)
    .get()
  return snap.exists ? snap.data() : null
}

module.exports = {
  adminApp,
  uniqueSuffix,
  seedStudent,
  seedProject,
  getProject,
  setProjectFields,
  getProjectInvite,
}
