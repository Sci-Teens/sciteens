const React = require('react')

const h = React.createElement
const SITE_URL = 'https://sciteens.org'

const styles = {
  body: {
    backgroundColor: '#f5fff5',
    margin: '0',
    padding: '0',
  },
  page: {
    backgroundColor: '#f5fff5',
  },
  pageCell: {
    color: '#1a1a1a',
    fontFamily: 'Arial, Helvetica, sans-serif',
    padding: '32px 16px',
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #d9e7dc',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '560px',
    overflow: 'hidden',
  },
  header: {
    borderBottom: '1px solid #d9e7dc',
  },
  headerCell: {
    padding: '24px 32px',
  },
  brand: {
    color: '#236648',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    lineHeight: '28px',
    margin: '0',
  },
  contentCell: {
    padding: '32px',
  },
  heading: {
    color: '#1a1a1a',
    fontSize: '26px',
    fontWeight: '700',
    letterSpacing: '-0.3px',
    lineHeight: '32px',
    margin: '0 0 16px',
  },
  text: {
    color: '#38423b',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
  },
  action: {
    margin: '24px 0 0',
  },
  buttonCell: {
    backgroundColor: '#236648',
    borderRadius: '8px',
    padding: '12px 18px',
  },
  button: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    lineHeight: '20px',
    textDecoration: 'none',
  },
  footer: {
    borderTop: '1px solid #d9e7dc',
  },
  footerCell: {
    padding: '20px 32px',
  },
  footerText: {
    color: '#526057',
    fontSize: '12px',
    lineHeight: '18px',
    margin: '0',
  },
  footerLink: {
    color: '#236648',
    textDecoration: 'underline',
  },
  preview: {
    display: 'none',
    lineHeight: '1px',
    maxHeight: '0',
    maxWidth: '0',
    opacity: '0',
    overflow: 'hidden',
  },
}

function toText(value) {
  return String(value ?? '')
}

// React escapes text children. Links still need an explicit scheme policy.
function safeHref(url) {
  const value = toText(url)
  if (/^https:\/\//i.test(value)) return value
  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(
      value
    )
  )
    return value
  console.warn('Dropped non-https email link:', value)
  return '#'
}

function emailTable({ style, cellStyle, children }) {
  return h(
    'table',
    {
      align: 'center',
      border: '0',
      cellPadding: '0',
      cellSpacing: '0',
      role: 'presentation',
      style,
      width: '100%',
    },
    h(
      'tbody',
      null,
      h(
        'tr',
        { style: { width: '100%' } },
        h('td', { style: cellStyle }, children)
      )
    )
  )
}

function emailLink(href, children) {
  return h(
    'a',
    {
      href: safeHref(href),
      rel: 'noreferrer',
      style: styles.footerLink,
      target: '_blank',
    },
    children
  )
}

function actionButton(href, label) {
  return h(
    'table',
    {
      align: 'left',
      border: '0',
      cellPadding: '0',
      cellSpacing: '0',
      role: 'presentation',
      style: styles.action,
    },
    h(
      'tbody',
      null,
      h(
        'tr',
        null,
        h(
          'td',
          {
            bgcolor: '#236648',
            style: styles.buttonCell,
          },
          h(
            'a',
            {
              href: safeHref(href),
              rel: 'noreferrer',
              style: styles.button,
              target: '_blank',
            },
            label
          )
        )
      )
    )
  )
}

function layout({ preview, children, unsubscribeUrl }) {
  return h(
    'html',
    { dir: 'ltr', lang: 'en' },
    h(
      'head',
      null,
      h('meta', {
        content: 'text/html; charset=UTF-8',
        httpEquiv: 'Content-Type',
      }),
      h('meta', {
        name: 'x-apple-disable-message-reformatting',
      })
    ),
    h(
      'body',
      { style: styles.body },
      h('div', { style: styles.preview }, preview),
      emailTable({
        style: styles.page,
        cellStyle: styles.pageCell,
        children: emailTable({
          style: styles.container,
          children: h(
            React.Fragment,
            null,
            emailTable({
              style: styles.header,
              cellStyle: styles.headerCell,
              children: h(
                'p',
                { style: styles.brand },
                'SciTeens'
              ),
            }),
            emailTable({
              cellStyle: styles.contentCell,
              children,
            }),
            emailTable({
              style: styles.footer,
              cellStyle: styles.footerCell,
              children: h(
                React.Fragment,
                null,
                h(
                  'p',
                  { style: styles.footerText },
                  'SciTeens · ',
                  emailLink(SITE_URL, 'sciteens.org')
                ),
                unsubscribeUrl
                  ? h(
                      'p',
                      { style: styles.footerText },
                      emailLink(
                        unsubscribeUrl,
                        'Unsubscribe'
                      ),
                      ' or manage your email preferences.'
                    )
                  : null
              ),
            })
          ),
        }),
      })
    )
  )
}

function template({
  title,
  preview,
  content,
  action,
  unsubscribeUrl,
}) {
  return layout({
    preview,
    unsubscribeUrl,
    children: [
      h(
        'h1',
        {
          key: 'heading',
          style: styles.heading,
        },
        title
      ),
      ...content.map((paragraph, index) =>
        h(
          'p',
          {
            key: `paragraph-${index}`,
            style: styles.text,
          },
          paragraph
        )
      ),
      action
        ? h(React.Fragment, { key: 'action' }, action)
        : null,
    ],
  })
}

function verifyEmailTemplate({ link }) {
  return template({
    title: 'Verify your email',
    preview:
      'Verify your email address to finish setting up your account.',
    content: [
      'Thanks for signing up! Please verify your email address to finish setting up your account.',
    ],
    action: actionButton(link, 'Verify Email'),
  })
}

function newsletterConfirmationTemplate({ link }) {
  return template({
    title: 'Confirm your subscription',
    preview:
      'Confirm your email address to receive the SciTeens newsletter.',
    content: [
      'Confirm your email address to receive the SciTeens newsletter.',
      'If you did not request this, you can ignore this email.',
    ],
    action: actionButton(link, 'Confirm subscription'),
  })
}

function newsletterWelcomeTemplate({ unsubscribeUrl }) {
  return template({
    title: 'Your subscription is confirmed',
    preview:
      'Your SciTeens newsletter subscription is confirmed.',
    content: [
      'Your SciTeens newsletter subscription is confirmed.',
      'We will send science stories and opportunities to this address.',
    ],
    unsubscribeUrl,
  })
}

function welcomeTemplate({ displayName, unsubscribeUrl }) {
  return template({
    title: `Welcome, ${toText(displayName) || 'there'}!`,
    preview: 'Welcome to the SciTeens community.',
    content: [
      `Hi ${toText(displayName) || 'there'},`,
      "Welcome to SciTeens! We're excited to have you join our community.",
    ],
    unsubscribeUrl,
  })
}

function newFeedbackTemplate({
  studentOrMentor,
  projectLink,
}) {
  return template({
    title: 'New feedback on your project',
    preview: 'A new comment needs your attention.',
    content: [
      `A ${toText(
        studentOrMentor
      )} left new feedback on your project.`,
    ],
    action: actionButton(projectLink, 'View Feedback'),
  })
}

function upcomingProgramTemplate({ link, unsubscribeUrl }) {
  return template({
    title: 'An application deadline is near',
    preview:
      'A program that you follow has a deadline within one week.',
    content: [
      "A program you're subscribed to has an application deadline coming up within the week.",
    ],
    action: actionButton(link, 'View Program'),
    unsubscribeUrl,
  })
}

function projectUpdateTemplate({
  projectName,
  projectLink,
}) {
  return template({
    title: 'You joined a project',
    preview: 'You have been added to a SciTeens project.',
    content: [
      `You've been added to the project "${toText(
        projectName
      )}".`,
    ],
    action: actionButton(projectLink, 'View Project'),
  })
}

module.exports = {
  verifyEmailTemplate,
  welcomeTemplate,
  newFeedbackTemplate,
  upcomingProgramTemplate,
  projectUpdateTemplate,
  newsletterConfirmationTemplate,
  newsletterWelcomeTemplate,
}
