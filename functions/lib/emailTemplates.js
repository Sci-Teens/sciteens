// Simple inline HTML templates, standing in for the Mailjet-hosted
// templates until Resend templates are built out. Kept intentionally
// plain: a heading, a paragraph, and a single CTA link where relevant.

const GREEN = '#2e7d32'

function layout(bodyHtml, { unsubscribeUrl } = {}) {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <p style="font-size: 20px; font-weight: bold; color: ${GREEN};">SciTeens</p>
    ${bodyHtml}
    <p style="font-size: 12px; color: #666;">SciTeens &middot; sciteens.org</p>
    ${
      unsubscribeUrl
        ? `<p style="font-size: 12px; color: #666;"><a href="${unsubscribeUrl}" style="color: #666;">Unsubscribe</a> or manage your email preferences.</p>`
        : ''
    }
  </body>
</html>`
}

function button(href, label) {
  return `<p><a href="${href}" style="display: inline-block; background: ${GREEN}; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">${label}</a></p>`
}

function verifyEmailTemplate({ link }) {
  return layout(`
    <p>Thanks for signing up! Please verify your email address to finish setting up your account.</p>
    ${button(link, 'Verify Email')}
  `)
}

function welcomeTemplate({ displayName, unsubscribeUrl }) {
  return layout(
    `
    <p>Hi ${displayName || 'there'},</p>
    <p>Welcome to SciTeens! We're excited to have you join our community.</p>
  `,
    { unsubscribeUrl }
  )
}

function newFeedbackTemplate({
  studentOrMentor,
  projectLink,
}) {
  return layout(`
    <p>A ${studentOrMentor} left new feedback on your project.</p>
    ${button(projectLink, 'View Feedback')}
  `)
}

function upcomingProgramTemplate({ link, unsubscribeUrl }) {
  return layout(
    `
    <p>A program you're subscribed to has an application deadline coming up within the week.</p>
    ${button(link, 'View Program')}
  `,
    { unsubscribeUrl }
  )
}

function projectUpdateTemplate({
  projectName,
  projectLink,
}) {
  return layout(`
    <p>You've been added to the project "${projectName}".</p>
    ${button(projectLink, 'View Project')}
  `)
}

module.exports = {
  verifyEmailTemplate,
  welcomeTemplate,
  newFeedbackTemplate,
  upcomingProgramTemplate,
  projectUpdateTemplate,
}
