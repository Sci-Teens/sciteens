const { Resend } = require('resend')
const {
  defineSecret,
} = require('firebase-functions/params')

// functions.config() was removed in firebase-functions v7, so credentials
// are a Secret Manager param instead. Secrets are only readable at
// invocation time (after being bound via `.runWith({ secrets: [...] })`
// on each export that needs them), so the client is built lazily rather
// than at module load.
const resendApiKey = defineSecret('RESEND_APIKEY')
let resendClient
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(resendApiKey.value())
  }
  return resendClient
}

// Single Resend audience holding every contact who hasn't unsubscribed.
// Mentor/student distinction is tracked via Firebase Auth custom claims,
// not separate mailing lists.
const CONTACTS_AUDIENCE_ID =
  '8c384f39-b01c-4cc8-a97e-1c9660c85225'

const FROM = 'SciTeens <noreply@sciteens.org>'

async function sendEmail({ to, toName, subject, html }) {
  return getResend().emails.send({
    from: FROM,
    to: toName ? `${toName} <${to}>` : to,
    subject,
    html,
  })
}

// Adds (or upserts) a contact to the all-contacts audience. Never throws
// on failure — email delivery/list membership is best-effort and must
// not block the write that triggered it.
async function addContact({ email, firstName, lastName }) {
  try {
    const result = await getResend().contacts.create({
      audienceId: CONTACTS_AUDIENCE_ID,
      email,
      firstName,
      lastName,
      unsubscribed: false,
    })
    if (result.error) {
      console.log('resend addContact error:', result.error)
    }
    return result
  } catch (err) {
    console.log('resend addContact error:', err)
  }
}

module.exports = {
  resendApiKey,
  sendEmail,
  addContact,
  CONTACTS_AUDIENCE_ID,
}
