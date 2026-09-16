// Opt-outable email categories. Transactional/service emails (email
// verification, discussion-reply notifications, "added to a project")
// are NOT modeled here — CAN-SPAM exempts messages required to complete
// a transaction the user already initiated, and no reasonable user
// should be able to silently miss those. These categories remain separate
// from newsletter membership because scheduled program reminders use their own
// profile-level opt-out.
const EMAIL_CATEGORIES = {
  GENERAL: 'general',
  PROGRAMS: 'programs',
}

const EMAIL_CATEGORY_VALUES = Object.values(
  EMAIL_CATEGORIES
)

// Plunk keeps account holders and confirmed newsletter readers apart.
// Only the newsletter confirmation flow may add a contact to NEWSLETTER.
const CONTACT_AUDIENCES = {
  TRANSACTIONAL: 'transactional',
  NEWSLETTER: 'newsletter',
}

const CONTACT_AUDIENCE_NAMES = {
  [CONTACT_AUDIENCES.TRANSACTIONAL]:
    'SciTeens - Transactional',
  [CONTACT_AUDIENCES.NEWSLETTER]: 'SciTeens - Newsletter',
}

module.exports = {
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_VALUES,
  CONTACT_AUDIENCES,
  CONTACT_AUDIENCE_NAMES,
}
