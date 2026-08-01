import { describe, expect, it } from 'vitest'
const {
  projectUpdateTemplate,
  welcomeTemplate,
  verifyEmailTemplate,
  newFeedbackTemplate,
} = require('./emailTemplates')

// Project titles and display names are user-authored and land inside a
// SciTeens-branded message, so an unescaped one lets a project member
// ship their own markup from our From address.
describe('email template escaping', () => {
  it('escapes a project title that tries to close the paragraph', () => {
    const html = projectUpdateTemplate({
      projectName:
        '</p><a href="https://evil.example">Reset your password</a><p>',
      projectLink: 'https://sciteens.org/project/abc',
    })
    expect(html).not.toContain(
      '<a href="https://evil.example"'
    )
    expect(html).toContain('&lt;/p&gt;&lt;a href=&quot;')
  })

  it('escapes a display name', () => {
    const html = welcomeTemplate({
      displayName: '<img src=x onerror=alert(1)>',
    })
    expect(html).not.toContain('<img')
    expect(html).toContain(
      '&lt;img src=x onerror=alert(1)&gt;'
    )
  })

  it('still greets generically when there is no display name', () => {
    expect(welcomeTemplate({})).toContain('Hi there,')
  })

  it('keeps an https action link intact', () => {
    const link =
      'https://sciteens.org/verify?oobCode=abc123'
    expect(verifyEmailTemplate({ link })).toContain(
      `href="${link}"`
    )
  })

  it('allows a loopback link so the Auth emulator flow works', () => {
    const link =
      'http://127.0.0.1:9099/emulator/action?mode=verifyEmail'
    expect(verifyEmailTemplate({ link })).toContain(
      `href="${link}"`
    )
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://evil.example/phish',
  ])('neutralises a %s action link', (link) => {
    const html = verifyEmailTemplate({ link })
    expect(html).toContain('href="#"')
    expect(html).not.toContain(link)
  })

  it('escapes an interpolated role label', () => {
    const html = newFeedbackTemplate({
      studentOrMentor: '<b>admin</b>',
      projectLink: 'https://sciteens.org/project/abc',
    })
    expect(html).not.toContain('<b>admin</b>')
  })
})
