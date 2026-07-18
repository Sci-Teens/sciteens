// Opt-outable email categories. Transactional/service emails (email
// verification, discussion-reply notifications, "added to a project")
// are NOT modeled here — CAN-SPAM exempts messages required to complete
// a transaction the user already initiated, and no reasonable user
// should be able to silently miss those. Only emails a reasonable
// person would call "marketing" or "a subscription" go through the
// category system in resend.js (subscription gating + unsubscribe
// links + a dedicated Resend audience per category).
const EMAIL_CATEGORIES = {
  GENERAL: 'general',
  PROGRAMS: 'programs',
}

const EMAIL_CATEGORY_VALUES = Object.values(
  EMAIL_CATEGORIES
)

// One Resend audience per category, distinct from the legacy
// CONTACTS_AUDIENCE_ID all-contacts list in resend.js (kept as-is so
// existing Resend-side segments/broadcasts built against it don't
// break). getOrCreateAudience() in resend.js provisions these lazily
// by name, so no audience id needs to be hardcoded here.
const CATEGORY_AUDIENCE_NAMES = {
  [EMAIL_CATEGORIES.GENERAL]: 'SciTeens - General',
  [EMAIL_CATEGORIES.PROGRAMS]: 'SciTeens - Programs',
}

module.exports = {
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_VALUES,
  CATEGORY_AUDIENCE_NAMES,
}
