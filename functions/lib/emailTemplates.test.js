import { describe, expect, it } from 'vitest'
const { render } = require('@react-email/render')
const {
  newFeedbackTemplate,
  newsletterConfirmationTemplate,
  newsletterWelcomeTemplate,
  projectUpdateTemplate,
  upcomingProgramTemplate,
  verifyEmailTemplate,
  welcomeTemplate,
} = require('./emailTemplates')

describe('React email templates', () => {
  it.each([
    [
      'verification',
      verifyEmailTemplate({
        link: 'https://sciteens.org/verify?oobCode=abc123',
      }),
      'Verify your email',
    ],
    [
      'welcome',
      welcomeTemplate({
        displayName: 'Ada',
        unsubscribeUrl:
          'https://sciteens.org/unsubscribe?token=abc',
      }),
      'Welcome, Ada!',
    ],
    [
      'feedback notification',
      newFeedbackTemplate({
        studentOrMentor: 'student',
        projectLink: 'https://sciteens.org/project/abc',
      }),
      'New feedback on your project',
    ],
    [
      'program deadline',
      upcomingProgramTemplate({
        link: 'https://sciteens.org/program/abc',
        unsubscribeUrl:
          'https://sciteens.org/unsubscribe?token=abc',
      }),
      'An application deadline is near',
    ],
    [
      'project invitation',
      projectUpdateTemplate({
        projectName: 'Solar Sail',
        projectLink: 'https://sciteens.org/project/abc',
      }),
      'You joined a project',
    ],
    [
      'newsletter confirmation',
      newsletterConfirmationTemplate({
        link: 'https://sciteens.org/newsletter/confirm?token=abc',
      }),
      'Confirm your subscription',
    ],
    [
      'newsletter welcome',
      newsletterWelcomeTemplate({
        unsubscribeUrl:
          'https://sciteens.org/unsubscribe?token=abc',
      }),
      'Your subscription is confirmed',
    ],
  ])(
    'renders the %s email',
    async (_, template, heading) => {
      const html = await render(template)

      expect(html).toContain('<!DOCTYPE html')
      expect(html).toContain('SciTeens')
      expect(html).toContain(heading)
    }
  )

  it('escapes a project title that tries to close a paragraph', async () => {
    const html = await render(
      projectUpdateTemplate({
        projectName:
          '</p><a href="https://evil.example">Reset your password</a><p>',
        projectLink: 'https://sciteens.org/project/abc',
      })
    )

    expect(html).not.toContain(
      '<a href="https://evil.example"'
    )
    expect(html).toContain('&lt;/p&gt;&lt;a href=&quot;')
  })

  it('escapes a display name', async () => {
    const html = await render(
      welcomeTemplate({
        displayName: '<img src=x onerror=alert(1)>',
      })
    )

    expect(html).not.toContain('<img')
    expect(html).toContain(
      '&lt;img src=x onerror=alert(1)&gt;'
    )
  })

  it('greets generically when there is no display name', async () => {
    const html = await render(welcomeTemplate({}))

    expect(html).toContain('Hi there,')
  })

  it('keeps an https action link intact', async () => {
    const link =
      'https://sciteens.org/verify?oobCode=abc123'
    const html = await render(verifyEmailTemplate({ link }))

    expect(html).toContain(`href="${link}"`)
    expect(html).toContain('background-color:#236648')
    expect(html).toContain('bgcolor="#236648"')
    expect(html).toContain('padding:12px 18px')
    expect(html).toContain('>Verify Email</a>')
  })

  it('allows a loopback link so the Auth emulator flow works', async () => {
    const link =
      'http://127.0.0.1:9099/emulator/action?mode=verifyEmail'
    const html = await render(verifyEmailTemplate({ link }))

    expect(html).toContain(`href="${link}"`)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://evil.example/phish',
  ])('neutralises a %s action link', async (link) => {
    const html = await render(verifyEmailTemplate({ link }))

    expect(html).toContain('href="#"')
    expect(html).not.toContain(link)
  })

  it('escapes an interpolated role label', async () => {
    const html = await render(
      newFeedbackTemplate({
        studentOrMentor: '<b>admin</b>',
        projectLink: 'https://sciteens.org/project/abc',
      })
    )

    expect(html).not.toContain('<b>admin</b>')
  })
})
